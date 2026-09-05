from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def make_client() -> TestClient:
    settings = Settings(
        environment="test",
        predictor_backend="deterministic",
        embedding_backend="hash",
        cors_origins="http://localhost:5173",
    )
    return TestClient(create_app(settings))


def valid_payload() -> dict[str, object]:
    return {
        "bid_id": 42,
        "title": "통신공사 입찰공고",
        "expected_price_range": 3.0,
        "award_lower_rate": 86.745,
        "estimate_price": 1_000_000_000,
        "budget": 1_201_490_000,
    }


def test_health_readiness_and_prediction_contract() -> None:
    with make_client() as client:
        assert client.get("/health").json() == {"status": "ok"}
        assert client.get("/ready").json() == {"status": "ready"}

        response = client.post("/v1/predictions", json=valid_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["bid_id"] == 42
    assert payload["predicted_award_amount"] > 0
    assert payload["model_version"] == "development-deterministic-v1"
    assert response.headers["X-Request-ID"]


def test_invalid_prediction_uses_standard_error_contract() -> None:
    payload = valid_payload()
    payload["award_lower_rate"] = 0
    with make_client() as client:
        response = client.post("/v1/predictions", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in response.json()["error"]


def test_analysis_returns_grounded_hybrid_sources() -> None:
    with make_client() as client:
        response = client.post("/v1/analysis", json=valid_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["retrieval"]["retrieval_strategy"] == "bm25+dense+rrf"
    assert body["retrieval"]["sources"]


def test_unavailable_runtime_uses_safe_service_error(tmp_path: Path) -> None:
    settings = Settings(
        environment="test",
        predictor_backend="deterministic",
        embedding_backend="hash",
        rag_corpus_path=tmp_path / "missing.jsonl",
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_production_rejects_non_production_backends() -> None:
    with pytest.raises(ValueError):
        Settings(environment="production", predictor_backend="deterministic", embedding_backend="hash")
