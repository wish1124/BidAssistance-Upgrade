from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LEGACY_MODEL_DIR = REPOSITORY_ROOT / "BE_AI_server" / "AI_server"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and register the bid award model with MLflow.")
    parser.add_argument("--data", type=Path, default=REPOSITORY_ROOT / "BE_AI_server/dataset/preprocessed_dataset.csv")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--tracking-uri", required=True)
    parser.add_argument("--experiment", default="bid-award-prediction")
    parser.add_argument("--registered-model-name", default="BidAwardPredictor")
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--minimum-rows", type=int, default=1_000)
    return parser.parse_args()


def _require_mlflow() -> Any:
    try:
        import mlflow
        import mlflow.pytorch
    except ImportError as error:  # pragma: no cover - environment dependency guard
        raise RuntimeError("Install mlops/requirements.txt before running model training") from error
    return mlflow


def _load_legacy_training_module() -> Any:
    if str(LEGACY_MODEL_DIR) not in sys.path:
        sys.path.insert(0, str(LEGACY_MODEL_DIR))
    try:
        import model_transformer
    except ImportError as error:  # pragma: no cover - legacy dependency guard
        raise RuntimeError("Unable to import the existing Transformer training module") from error
    return model_transformer


def train_and_register(args: argparse.Namespace) -> dict[str, Any]:
    mlflow = _require_mlflow()
    training = _load_legacy_training_module()
    if not args.data.exists():
        raise FileNotFoundError(f"Training data does not exist: {args.data}")

    dataframe = training.read_csv_safely(args.data)
    if len(dataframe) < args.minimum_rows:
        raise ValueError(f"Expected at least {args.minimum_rows} rows, found {len(dataframe)}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(args.tracking_uri)
    mlflow.set_experiment(args.experiment)

    with mlflow.start_run() as run:
        result = training.run_training_transformer(
            df=dataframe,
            feature_cols=["기초금액", "추정가격", "예가범위", "냙찰하한율"],
            target_col="냙찰가",
            epochs=args.epochs,
            output_dir=str(args.output_dir),
        )
        mlflow.log_params({key: str(value) for key, value in asdict(result.config).items()})
        mlflow.log_param("training_rows", len(dataframe))
        mlflow.log_metrics({f"val_{key.lower()}": float(value) for key, value in result.best_val.items()})
        mlflow.log_metrics({f"test_{key.lower()}": float(value) for key, value in result.test.items()})
        mlflow.log_artifacts(str(args.output_dir), artifact_path="training")
        mlflow.pytorch.log_model(result.model, artifact_path="model")
        mlflow.set_tags({"model_family": "tabular-transformer", "feature_contract": "4-feature-v1"})

        registered = mlflow.register_model(
            model_uri=f"runs:/{run.info.run_id}/model",
            name=args.registered_model_name,
        )

    from mlops.training.registry import set_candidate_alias, wait_until_ready

    client = mlflow.MlflowClient()
    wait_until_ready(client, args.registered_model_name, str(registered.version))
    set_candidate_alias(client, args.registered_model_name, str(registered.version))
    summary = {
        "run_id": run.info.run_id,
        "model_name": args.registered_model_name,
        "model_version": str(registered.version),
        "candidate_mae": float(result.test["MAE"]),
        "tracking_uri": args.tracking_uri,
    }
    summary_path = args.output_dir / "run-summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    summary = train_and_register(parse_args())
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
