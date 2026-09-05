"""Daily, manifest-driven model retraining DAG.

The scheduler does not scrape or mutate the serving database. A validated data
pipeline writes a dataset manifest, then this DAG decides whether retraining is
justified and records every model candidate in MLflow.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from airflow.decorators import dag, task


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST_PATH = "/opt/airflow/data/bid-dataset-manifest.json"


@dag(
    dag_id="bid_model_retrain",
    description="Retrain and evaluate the bid award model when labelled data accumulates.",
    schedule="0 3 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["bid", "mlops"],
)
def bid_model_retrain():
    @task
    def read_manifest() -> dict[str, object]:
        path = Path(os.getenv("BID_DATASET_MANIFEST_PATH", DEFAULT_MANIFEST_PATH))
        if not path.exists():
            raise FileNotFoundError(f"Dataset manifest not found: {path}")
        manifest = json.loads(path.read_text(encoding="utf-8"))
        for key in ("dataset_path", "new_labeled_rows"):
            if key not in manifest:
                raise ValueError(f"Dataset manifest must include {key}")
        return manifest

    @task.short_circuit
    def has_enough_new_labels(manifest: dict[str, object]) -> bool:
        threshold = int(os.getenv("BID_RETRAIN_MIN_NEW_ROWS", "1000"))
        return int(manifest["new_labeled_rows"]) >= threshold

    @task
    def train_candidate(manifest: dict[str, object]) -> dict[str, object]:
        run_dir = REPOSITORY_ROOT / "artifacts" / "retraining" / datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        command = [
            sys.executable,
            str(REPOSITORY_ROOT / "mlops" / "training" / "train.py"),
            "--data", str(manifest["dataset_path"]),
            "--output-dir", str(run_dir),
            "--tracking-uri", os.environ["MLFLOW_TRACKING_URI"],
            "--experiment", os.getenv("MLFLOW_EXPERIMENT", "bid-award-prediction"),
            "--registered-model-name", os.getenv("MLFLOW_MODEL_NAME", "BidAwardPredictor"),
        ]
        subprocess.run(command, cwd=REPOSITORY_ROOT, check=True)
        return json.loads((run_dir / "run-summary.json").read_text(encoding="utf-8"))

    @task
    def promote_candidate(summary: dict[str, object]) -> bool:
        if os.getenv("BID_AUTO_PROMOTE", "false").lower() != "true":
            return False
        import mlflow

        from mlops.training.registry import promote_if_materially_better

        mlflow.set_tracking_uri(str(summary["tracking_uri"]))
        client = mlflow.MlflowClient()
        return promote_if_materially_better(
            client=client,
            model_name=str(summary["model_name"]),
            candidate_version=str(summary["model_version"]),
            candidate_mae=float(summary["candidate_mae"]),
            minimum_relative_improvement=float(os.getenv("BID_MIN_RELATIVE_MAE_IMPROVEMENT", "0.02")),
        )

    manifest = read_manifest()
    gate = has_enough_new_labels(manifest)
    candidate = train_candidate(manifest)
    gate >> candidate
    promote_candidate(candidate)


bid_model_retrain()
