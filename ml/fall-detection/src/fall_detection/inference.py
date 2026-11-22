"""Isolated Python inference API for fall detection."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
from sklearn.pipeline import Pipeline

from .artifacts import load_artifact_bundle
from .features import ALL_FEATURE_NAMES, extract_features_from_window
from .preprocessing import normalize_coordinates_and_extract_anchor, resample_temporal_sequence
from .schema import EXPECTED_LANDMARK_COUNT, PoseFrame
from .windowing import WindowData


class FallClassifier:
    """Loaded inference model wrapper for fall detection."""

    def __init__(
        self,
        pipeline: Pipeline,
        metadata: Dict[str, Any],
    ) -> None:
        self.pipeline = pipeline
        self.metadata = metadata
        self.model_version = metadata.get("model_version", "unknown")
        self.feature_names: List[str] = metadata.get("feature_names", ALL_FEATURE_NAMES)
        self.threshold: float = float(metadata.get("optimal_threshold", 0.5))
        self.target_cadence_hz: float = float(
            metadata.get("preprocessing_config", {}).get("target_cadence_hz", 20.0)
        )
        self.min_frames: int = int(
            metadata.get("windowing_config", {}).get("min_frames_per_window", 20)
        )

    @classmethod
    def load(cls, artifact_path: Union[str, Path]) -> FallClassifier:
        """Load classifier from artifact bundle."""
        pipe, meta = load_artifact_bundle(artifact_path)
        return cls(pipeline=pipe, metadata=meta)

    def predict(
        self,
        pose_window: Union[WindowData, List[PoseFrame], List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        """Perform fall classification on a pose window.

        Args:
            pose_window: A WindowData object, list of PoseFrame objects, or list of dicts.

        Returns:
            Dict containing:
                label: 'fall' | 'normal' | None (if invalid)
                fall_score: float [0.0, 1.0]
                is_valid: bool
                reason: Optional error reason string if invalid
                model_version: str
                window: Dict with start_ms and end_ms
        """
        # Convert raw dicts or frames to WindowData if needed
        window, validation_error = self._prepare_window(pose_window)
        if validation_error or window is None:
            return {
                "label": None,
                "fall_score": 0.0,
                "is_valid": False,
                "reason": validation_error or "Invalid window input",
                "model_version": self.model_version,
                "window": {
                    "start_ms": None,
                    "end_ms": None,
                },
            }

        # Quality check: reject windows with insufficient valid body landmarks
        valid_ratio = float(np.mean(window.validity_mask))
        if valid_ratio < 0.25:
            return {
                "label": None,
                "fall_score": 0.0,
                "is_valid": False,
                "reason": f"Insufficient usable body landmarks (valid ratio: {valid_ratio:.2f} < 0.25)",
                "model_version": self.model_version,
                "window": {
                    "start_ms": window.start_ms,
                    "end_ms": window.end_ms,
                },
            }

        # Feature extraction
        feature_set = self.metadata.get("feature_set", "geometry_temporal_quality")
        features_dict = extract_features_from_window(window, feature_set=feature_set)
        feature_vector = np.array(
            [[features_dict.get(fname, 0.0) for fname in self.feature_names]],
            dtype=np.float32,
        )

        # Model inference
        probs = self.pipeline.predict_proba(feature_vector)
        # Class 1 is 'fall'
        fall_score = float(probs[0, 1])
        predicted_label = "fall" if fall_score >= self.threshold else "normal"

        return {
            "label": predicted_label,
            "fall_score": round(fall_score, 4),
            "is_valid": True,
            "reason": None,
            "model_version": self.model_version,
            "window": {
                "start_ms": window.start_ms,
                "end_ms": window.end_ms,
            },
        }

    def _prepare_window(
        self,
        pose_window: Union[WindowData, List[PoseFrame], List[Dict[str, Any]]],
    ) -> Tuple[Optional[WindowData], Optional[str]]:
        """Normalize input into a validated WindowData object."""
        if isinstance(pose_window, WindowData):
            if len(pose_window.timestamps_ms) < self.min_frames:
                return (
                    None,
                    f"Window has only {len(pose_window.timestamps_ms)} frames; minimum is {self.min_frames}.",
                )
            return pose_window, None

        if not isinstance(pose_window, list) or len(pose_window) == 0:
            return None, "Empty or non-list pose sequence provided."

        # Parse list of frames or dicts
        frames: List[PoseFrame] = []
        for idx, item in enumerate(pose_window):
            if isinstance(item, PoseFrame):
                frames.append(item)
            elif isinstance(item, dict):
                try:
                    frames.append(PoseFrame.from_dict(item))
                except Exception as e:
                    return None, f"Failed to parse frame at index {idx}: {str(e)}"
            else:
                return None, f"Unexpected item type at index {idx}: {type(item).__name__}"

        if len(frames) < self.min_frames:
            return (
                None,
                f"Window has only {len(frames)} frames; minimum is {self.min_frames}.",
            )

        # Check landmark counts
        for i, f in enumerate(frames):
            if len(f.landmarks) != EXPECTED_LANDMARK_COUNT:
                return (
                    None,
                    f"Frame {i} has {len(f.landmarks)} landmarks; expected {EXPECTED_LANDMARK_COUNT}.",
                )

        from .preprocessing import frames_to_numpy

        timestamps, coords, val, vis = frames_to_numpy(frames)
        norm_ts, norm_coords, norm_val, norm_vis = resample_temporal_sequence(
            timestamps,
            coords,
            val,
            vis,
            target_cadence_hz=self.target_cadence_hz,
            max_gap_interpolation_ms=350,
        )
        coords_norm, hip_y = normalize_coordinates_and_extract_anchor(
            norm_coords, norm_val
        )

        w = WindowData(
            window_id="inference_window",
            sequence_id="live_stream",
            subject_id="online",
            session_id="online",
            start_ms=int(norm_ts[0]),
            end_ms=int(norm_ts[-1]),
            timestamps_ms=norm_ts,
            coords_norm=coords_norm,
            coords_raw=norm_coords,
            validity_mask=norm_val,
            visibility=norm_vis,
            hip_global_y=hip_y,
            label="unknown",
            quality_score=float(np.mean(norm_val)),
        )
        return w, None


def predict_window(
    pose_window: Union[WindowData, List[PoseFrame], List[Dict[str, Any]]],
    artifact_path: Union[str, Path],
) -> Dict[str, Any]:
    """Convenience helper to load artifact and perform inference on a single window."""
    classifier = FallClassifier.load(artifact_path)
    return classifier.predict(pose_window)
