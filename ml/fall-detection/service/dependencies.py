"""Dependencies and model lifecycle management for the inference service."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fall_detection.inference import FallClassifier
from .config import DEFAULT_MODEL_PATH

logger = logging.getLogger("fall_detection_service")

_classifier_instance: Optional[FallClassifier] = None


def get_classifier(model_path: Optional[str] = None) -> FallClassifier:
    """Get or load the singleton FallClassifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        target_path = Path(model_path or DEFAULT_MODEL_PATH)
        logger.info(f"Loading FallClassifier from {target_path}...")
        if not target_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {target_path}")
        _classifier_instance = FallClassifier.load(target_path)
        logger.info(
            f"FallClassifier loaded successfully (version: {_classifier_instance.model_version}, "
            f"threshold: {_classifier_instance.threshold})"
        )
    return _classifier_instance


def reset_classifier() -> None:
    """Reset the singleton instance (useful for testing)."""
    global _classifier_instance
    _classifier_instance = None
