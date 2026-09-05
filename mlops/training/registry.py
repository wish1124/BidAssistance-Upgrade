from __future__ import annotations

import time
from typing import Any


def is_materially_better(candidate_mae: float, champion_mae: float, minimum_relative_improvement: float = 0.02) -> bool:
    """Return true only when a lower MAE clears the configured improvement bar."""
    if candidate_mae < 0 or champion_mae <= 0:
        raise ValueError("MAE values must be non-negative and champion MAE must be positive")
    if not 0 < minimum_relative_improvement < 1:
        raise ValueError("minimum_relative_improvement must be between zero and one")
    return candidate_mae <= champion_mae * (1 - minimum_relative_improvement)


def find_model_version_for_run(client: Any, model_name: str, run_id: str) -> str:
    versions = client.search_model_versions(f"name='{model_name}'")
    matched = [version for version in versions if version.run_id == run_id]
    if not matched:
        raise LookupError(f"No registered model version found for run {run_id}")
    return str(max(matched, key=lambda version: int(version.version)).version)


def set_candidate_alias(client: Any, model_name: str, version: str) -> None:
    client.set_registered_model_alias(model_name, "candidate", version)


def wait_until_ready(client: Any, model_name: str, version: str, timeout_seconds: int = 120) -> None:
    """Do not alias a model version while its registry registration is pending."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        model_version = client.get_model_version(model_name, version)
        if model_version.status == "READY":
            return
        if model_version.status == "FAILED_REGISTRATION":
            raise RuntimeError(f"Model registration failed: {model_version.status_message}")
        time.sleep(2)
    raise TimeoutError(f"Model registration did not finish within {timeout_seconds} seconds")


def promote_if_materially_better(
    client: Any,
    model_name: str,
    candidate_version: str,
    candidate_mae: float,
    minimum_relative_improvement: float = 0.02,
) -> bool:
    """Promote by alias, never by deprecated MLflow model stages."""
    try:
        champion = client.get_model_version_by_alias(model_name, "champion")
    except Exception as error:
        if getattr(error, "error_code", None) not in {"RESOURCE_DOES_NOT_EXIST", "NOT_FOUND"}:
            raise
        # The first evaluated candidate has no baseline to compare against.
        client.set_registered_model_alias(model_name, "champion", candidate_version)
        return True

    champion_run = client.get_run(champion.run_id)
    champion_mae = champion_run.data.metrics.get("test_mae")
    if champion_mae is None:
        raise LookupError("The current champion model has no test_mae metric")
    if not is_materially_better(candidate_mae, float(champion_mae), minimum_relative_improvement):
        return False
    client.set_registered_model_alias(model_name, "champion", candidate_version)
    return True
