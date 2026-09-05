from __future__ import annotations

import logging

from pythonjsonlogger.json import JsonFormatter


def configure_logging(level: str) -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    if root.handlers:
        return

    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s")
    )
    root.addHandler(handler)
