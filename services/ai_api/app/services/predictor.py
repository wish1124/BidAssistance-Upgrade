from __future__ import annotations

import ast
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from app.core.config import Settings


@dataclass(frozen=True)
class PredictionResult:
    ratio: float
    lower_ratio: float
    upper_ratio: float
    confidence: float
    model_version: str


class Predictor(Protocol):
    def predict(self, features: dict[str, float]) -> PredictionResult: ...


class DeterministicPredictor:
    """Portable development predictor. Production settings reject this backend."""

    model_version = "development-deterministic-v1"

    def predict(self, features: dict[str, float]) -> PredictionResult:
        lower_rate = features["낙찰하한율"] / 100
        expected_range = features["예가범위"] / 10000
        ratio = min(max(lower_rate + expected_range, 0.01), 1.5)
        return PredictionResult(
            ratio=ratio,
            lower_ratio=max(ratio - 0.005, 0.01),
            upper_ratio=ratio + 0.005,
            confidence=0.15,
            model_version=self.model_version,
        )


class LegacyTftPredictor:
    """Loads the existing quantile Transformer artifact without import-time side effects."""

    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self._load()

    def _load(self) -> None:
        try:
            import joblib
            import numpy as np
            import torch
            import torch.nn as nn
        except ImportError as error:  # pragma: no cover - production dependency guard
            raise RuntimeError("Install requirements-ml.txt to use legacy_tft") from error

        model_path = self.model_dir / "best_model.pt"
        scaler_path = self.model_dir / "scaler_X.pkl"
        features_path = self.model_dir / "features.txt"
        for artifact in (model_path, scaler_path, features_path):
            if not artifact.exists():
                raise FileNotFoundError(f"Required model artifact is missing: {artifact}")

        features = ast.literal_eval(features_path.read_text(encoding="utf-8").strip())
        if not isinstance(features, list) or not features:
            raise ValueError("features.txt must contain a non-empty list")

        class QuantileTransformerRegressor(nn.Module):
            def __init__(self, input_dim: int, num_quantiles: int) -> None:
                super().__init__()
                d_model = 512
                self.input_embedding = nn.Linear(input_dim, d_model)
                self.pos_encoder = nn.Parameter(torch.randn(1, 1, d_model))
                layer = nn.TransformerEncoderLayer(
                    d_model=d_model,
                    nhead=8,
                    dim_feedforward=2048,
                    dropout=0.1,
                    batch_first=True,
                )
                self.transformer_encoder = nn.TransformerEncoder(layer, num_layers=2)
                self.fc_out = nn.Sequential(
                    nn.Linear(d_model, 1024), nn.ReLU(), nn.Dropout(0.1),
                    nn.Linear(1024, 512), nn.ReLU(), nn.Dropout(0.1),
                    nn.Linear(512, num_quantiles),
                )

            def forward(self, values):
                values = self.input_embedding(values).unsqueeze(1) + self.pos_encoder
                values = self.transformer_encoder(values).squeeze(1)
                return self.fc_out(values)

        quantiles = sorted(set([round(value, 2) for value in np.linspace(0.05, 0.95, 10)] + [0.5]))
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = QuantileTransformerRegressor(len(features), len(quantiles)).to(device)
        checkpoint = torch.load(model_path, map_location=device)
        state = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
        model.load_state_dict(state, strict=False)
        model.eval()

        self.features = features
        self.quantiles = quantiles
        self.median_index = quantiles.index(0.5)
        self.device = device
        self.model = model
        self.np = np
        self.torch = torch
        self.scaler = joblib.load(scaler_path)
        self.model_version = f"legacy-tft-{self._checksum(model_path)[:12]}"

    @staticmethod
    def _checksum(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()

    @staticmethod
    def _normalize_ratio(value: float) -> float:
        return value / 100 if value > 2 else value

    def predict(self, features: dict[str, float]) -> PredictionResult:
        row = self.np.array([[float(features.get(name, 0.0)) for name in self.features]], dtype=self.np.float32)
        scaled = self.scaler.transform(row)
        with self.torch.no_grad():
            values = self.model(self.torch.tensor(scaled, dtype=self.torch.float32, device=self.device))
            predictions = values.cpu().numpy()[0]

        lower = self._normalize_ratio(float(self.np.quantile(predictions, 0.25)))
        ratio = self._normalize_ratio(float(predictions[self.median_index]))
        upper = self._normalize_ratio(float(self.np.quantile(predictions, 0.75)))
        return PredictionResult(
            ratio=max(ratio, 0.01),
            lower_ratio=max(lower, 0.01),
            upper_ratio=max(upper, 0.01),
            confidence=0.7,
            model_version=self.model_version,
        )


def create_predictor(settings: Settings) -> Predictor:
    if settings.predictor_backend == "legacy_tft":
        return LegacyTftPredictor(settings.model_dir)
    return DeterministicPredictor()
