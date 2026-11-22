"""Elderly Fall Detection ML Module (Milestone C).

Provides dataset ingestion, validation, temporal preprocessing, feature extraction,
baseline training, evaluation, and an isolated Python inference API.
"""

from .inference import FallClassifier, predict_window
from .schema import (
    CURRENT_SCHEMA_VERSION,
    EXPECTED_LANDMARK_COUNT,
    MEDIAPIPE_LANDMARK_NAMES,
    PoseFrame,
    PoseLandmark,
    PoseSequence,
)

__all__ = [
    "CURRENT_SCHEMA_VERSION",
    "EXPECTED_LANDMARK_COUNT",
    "MEDIAPIPE_LANDMARK_NAMES",
    "PoseLandmark",
    "PoseFrame",
    "PoseSequence",
    "FallClassifier",
    "predict_window",
]
