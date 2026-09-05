from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Iterator

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.core.config import Settings
from app.core.logging import configure_logging
from app.schemas import (
    AnalysisResponse,
    ErrorDetail,
    ErrorResponse,
    PredictionRequest,
    PredictionResponse,
    RetrievalResponse,
)
from app.services.predictor import Predictor, create_predictor
from app.services.retrieval import HybridRetriever


REQUEST_COUNT = Counter("bid_ai_http_requests_total", "HTTP requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("bid_ai_http_request_duration_seconds", "HTTP request latency", ["path"])
PREDICTION_LATENCY = Histogram("bid_ai_prediction_duration_seconds", "Model prediction latency")
logger = logging.getLogger(__name__)


class Runtime:
    def __init__(self, predictor: Predictor, retriever: HybridRetriever) -> None:
        self.predictor = predictor
        self.retriever = retriever


def _error_response(status_code: int, code: str, message: str, request: Request) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            request_id=getattr(request.state, "request_id", "unknown"),
        )
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


def create_app(settings: Settings | None = None, predictor: Predictor | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> Iterator[None]:
        app.state.runtime = None
        app.state.startup_error = None
        try:
            app.state.runtime = Runtime(
                predictor=predictor or create_predictor(settings),
                retriever=HybridRetriever.from_settings(settings),
            )
            logger.info("runtime_ready", extra={"request_id": "startup"})
        except Exception as error:
            app.state.startup_error = str(error)
            logger.exception("runtime_startup_failed", extra={"request_id": "startup"})
            if settings.fail_fast_on_startup:
                raise
        yield
        app.state.runtime = None

    app = FastAPI(
        title="BidAssistance AI API",
        version="1.0.0",
        lifespan=lifespan,
        responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    )

    @app.middleware("http")
    async def observe_requests(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            response = _error_response(500, "INTERNAL_ERROR", "Internal server error", request)
            logger.exception("request_failed", extra={"request_id": request_id})
        elapsed = time.perf_counter() - started
        REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
        REQUEST_LATENCY.labels(request.url.path).observe(elapsed)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, error: RequestValidationError):
        logger.warning("request_validation_failed", extra={"request_id": getattr(request.state, "request_id", "unknown")})
        return _error_response(422, "VALIDATION_ERROR", "Request validation failed", request)

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, error: HTTPException):
        code = "SERVICE_UNAVAILABLE" if error.status_code == 503 else "HTTP_ERROR"
        message = "AI runtime is not ready" if error.status_code == 503 else "Request could not be completed"
        return _error_response(error.status_code, code, message, request)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    def ready(request: Request) -> dict[str, str]:
        if request.app.state.runtime is None:
            raise HTTPException(status_code=503, detail="AI runtime is not ready")
        return {"status": "ready"}

    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    def runtime_for(request: Request) -> Runtime:
        runtime = request.app.state.runtime
        if runtime is None:
            raise HTTPException(status_code=503, detail="AI runtime is not ready")
        return runtime

    def predict_payload(payload: PredictionRequest, runtime: Runtime) -> PredictionResponse:
        started = time.perf_counter()
        result = runtime.predictor.predict(payload.feature_map())
        elapsed = time.perf_counter() - started
        PREDICTION_LATENCY.observe(elapsed)
        return PredictionResponse(
            bid_id=payload.bid_id,
            predicted_ratio=result.ratio,
            predicted_award_amount=round(payload.budget * result.ratio),
            lower_ratio=result.lower_ratio,
            upper_ratio=result.upper_ratio,
            confidence=result.confidence,
            model_version=result.model_version,
            latency_ms=round(elapsed * 1000, 3),
        )

    @app.post("/v1/predictions", response_model=PredictionResponse)
    def create_prediction(payload: PredictionRequest, request: Request) -> PredictionResponse:
        return predict_payload(payload, runtime_for(request))

    @app.get("/v1/retrieval", response_model=RetrievalResponse)
    def retrieve(
        request: Request,
        query: str = Query(min_length=2, max_length=500),
        top_k: int = Query(default=settings.rag_top_k, ge=1, le=20),
    ) -> RetrievalResponse:
        sources = runtime_for(request).retriever.retrieve(query, top_k)
        return RetrievalResponse(query=query, sources=sources)

    @app.post("/v1/analysis", response_model=AnalysisResponse)
    def analyze(payload: PredictionRequest, request: Request) -> AnalysisResponse:
        runtime = runtime_for(request)
        sources = runtime.retriever.retrieve(payload.title, settings.rag_top_k)
        return AnalysisResponse(
            prediction=predict_payload(payload, runtime),
            retrieval=RetrievalResponse(query=payload.title, sources=sources),
            generated_at=datetime.now(UTC),
        )

    return app


app = create_app()
