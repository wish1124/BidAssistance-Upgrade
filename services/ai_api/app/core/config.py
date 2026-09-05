from __future__ import annotations

from functools import cached_property
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVICE_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]


class Settings(BaseSettings):
    """Typed runtime configuration. Real values are injected, never committed."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="AI_API_",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173"

    predictor_backend: Literal["deterministic", "legacy_tft"] = "deterministic"
    model_dir: Path = REPOSITORY_ROOT / "BE_AI_server" / "model" / "tft_v3"

    embedding_backend: Literal["hash", "sentence_transformer"] = "hash"
    embedding_model_name: str = "jhgan/ko-sroberta-multitask"
    rag_corpus_path: Path = SERVICE_ROOT / "data" / "demo_corpus.jsonl"
    rag_top_k: int = Field(default=5, ge=1, le=20)
    rrf_k: int = Field(default=60, ge=1, le=200)

    @field_validator("cors_origins")
    @classmethod
    def reject_empty_origins(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("AI_API_CORS_ORIGINS must contain at least one origin")
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment != "production":
            return self
        if self.predictor_backend != "legacy_tft":
            raise ValueError("production requires AI_API_PREDICTOR_BACKEND=legacy_tft")
        if self.embedding_backend != "sentence_transformer":
            raise ValueError("production requires sentence_transformer embeddings")
        if "*" in self.allowed_origins:
            raise ValueError("production must not allow wildcard CORS origins")
        return self

    @cached_property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def fail_fast_on_startup(self) -> bool:
        return self.environment == "production"
