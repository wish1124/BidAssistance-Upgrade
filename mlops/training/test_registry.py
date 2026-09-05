from __future__ import annotations

import pytest

from mlops.training.registry import is_materially_better


def test_material_improvement_requires_two_percent_by_default() -> None:
    assert is_materially_better(97.9, 100.0)
    assert not is_materially_better(98.1, 100.0)


def test_invalid_mae_is_rejected() -> None:
    with pytest.raises(ValueError):
        is_materially_better(-1, 10)
