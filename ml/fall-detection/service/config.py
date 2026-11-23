"""Configuration settings for the fall detection inference service."""

import os
from pathlib import Path

# Resolve base dir of ml/fall-detection
BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    str(BASE_DIR / "models" / "random_forest_baseline")
)

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")
