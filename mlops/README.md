# MLOps: MLflow + Airflow

## Training contract

`training/train.py` reuses the current Transformer training implementation,
logs parameters, validation/test metrics, model artifacts, and a `candidate`
model alias in MLflow. It expects a CSV containing these columns:

`기초금액`, `추정가격`, `예가범위`, `낙찰하한율`, `낙찰가`.

Example:

```bash
python mlops/training/train.py \
  --data BE_AI_server/dataset/preprocessed_dataset.csv \
  --output-dir artifacts/manual-run \
  --tracking-uri http://mlflow:5000
```

Models are promoted with the `candidate` and `champion` aliases, not MLflow
model stages. A candidate must improve `test_mae` by at least 2% by default.

## Airflow contract

The `bid_model_retrain` DAG runs daily. A trusted upstream data pipeline must
write a JSON manifest such as:

```json
{
  "dataset_path": "/opt/airflow/data/preprocessed_dataset.csv",
  "new_labeled_rows": 1250
}
```

Set `MLFLOW_TRACKING_URI` and mount the project plus dataset/artifact storage
in the Airflow worker. Promotion is intentionally opt-in with
`BID_AUTO_PROMOTE=true`; otherwise each successful run stays at `candidate`.

Install Airflow with the official constraints matching the deployed Python and
Airflow versions. It has its own dependency constraints and is not installed by
the lightweight AI API test environment.
