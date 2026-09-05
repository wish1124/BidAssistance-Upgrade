from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PredictionRequest(BaseModel):
    bid_id: int = Field(gt=0, description="Internal bid notice identifier")
    title: str = Field(min_length=2, max_length=500)
    expected_price_range: float = Field(ge=0, le=100)
    award_lower_rate: float = Field(gt=0, le=100)
    estimate_price: float = Field(gt=0)
    budget: float = Field(gt=0)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value

    def feature_map(self) -> dict[str, float]:
        return {
            "예가범위": self.expected_price_range,
            "낙찰하한율": self.award_lower_rate,
            "추정가격": self.estimate_price,
            "기초금액": self.budget,
        }


class PredictionResponse(BaseModel):
    bid_id: int
    predicted_ratio: float = Field(gt=0)
    predicted_award_amount: float = Field(gt=0)
    lower_ratio: float = Field(gt=0)
    upper_ratio: float = Field(gt=0)
    confidence: float = Field(ge=0, le=1)
    model_version: str
    latency_ms: float = Field(ge=0)


class RetrievalSource(BaseModel):
    document_id: str
    title: str
    source: str
    excerpt: str
    rank: int = Field(ge=1)
    score: float


class RetrievalResponse(BaseModel):
    query: str
    sources: list[RetrievalSource]
    retrieval_strategy: Literal["bm25+dense+rrf"] = "bm25+dense+rrf"


class AnalysisResponse(BaseModel):
    prediction: PredictionResponse
    retrieval: RetrievalResponse
    generated_at: datetime
