"""Temporal resampling and coordinate normalization for PoseSequences."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .schema import EXPECTED_LANDMARK_COUNT, PoseFrame, PoseSequence

# Key landmark indices (MediaPipe 33-point topology)
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28


@dataclass
class PreprocessedSequence:
    """Structured preprocessed sequence with uniform temporal cadence."""

    sequence_id: str
    timestamps_ms: np.ndarray  # shape: (T,)
    coords_norm: np.ndarray  # shape: (T, 33, 3) hip-centered, torso-scaled
    coords_raw: np.ndarray  # shape: (T, 33, 3) frame-normalized [0, 1]
    validity_mask: np.ndarray  # shape: (T, 33) bool
    visibility: np.ndarray  # shape: (T, 33) float [0, 1]
    hip_global_y: np.ndarray  # shape: (T,) frame-normalized vertical hip position
    cadence_hz: float
    metadata: Dict[str, Any] = field(default_factory=dict)


def frames_to_numpy(
    frames: List[PoseFrame],
    min_visibility: float = 0.3,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Convert raw PoseFrames into numpy arrays.

    Returns:
        timestamps: (T,) int64
        coords: (T, 33, 3) float32
        validity: (T, 33) bool
        visibility: (T, 33) float32
    """
    num_frames = len(frames)
    timestamps = np.zeros(num_frames, dtype=np.int64)
    coords = np.zeros((num_frames, EXPECTED_LANDMARK_COUNT, 3), dtype=np.float32)
    validity = np.zeros((num_frames, EXPECTED_LANDMARK_COUNT), dtype=bool)
    visibility = np.zeros((num_frames, EXPECTED_LANDMARK_COUNT), dtype=np.float32)

    for i, frame in enumerate(frames):
        timestamps[i] = frame.timestamp_ms
        for j, lm in enumerate(frame.landmarks[:EXPECTED_LANDMARK_COUNT]):
            coords[i, j, 0] = lm.x
            coords[i, j, 1] = lm.y
            coords[i, j, 2] = lm.z if lm.z is not None else 0.0

            vis = lm.visibility if lm.visibility is not None else 1.0
            visibility[i, j] = vis

            is_coord_finite = math.isfinite(lm.x) and math.isfinite(lm.y)
            is_vis_ok = vis >= min_visibility
            validity[i, j] = is_coord_finite and is_vis_ok

    return timestamps, coords, validity, visibility


def resample_temporal_sequence(
    timestamps: np.ndarray,
    coords: np.ndarray,
    validity: np.ndarray,
    visibility: np.ndarray,
    target_cadence_hz: float = 20.0,
    max_gap_interpolation_ms: int = 350,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Resample non-uniform sequence to fixed uniform cadence.

    Uses linear interpolation across short gaps (<= max_gap_interpolation_ms).
    Gaps larger than max_gap_interpolation_ms are flagged as invalid.
    """
    if len(timestamps) < 2:
        return timestamps, coords, validity, visibility

    t_start = int(timestamps[0])
    t_end = int(timestamps[-1])
    dt_ms = 1000.0 / target_cadence_hz

    uniform_timestamps = np.arange(t_start, t_end + 1, dt_ms, dtype=np.float64)
    num_uniform = len(uniform_timestamps)
    uniform_coords = np.zeros((num_uniform, EXPECTED_LANDMARK_COUNT, 3), dtype=np.float32)
    uniform_validity = np.zeros((num_uniform, EXPECTED_LANDMARK_COUNT), dtype=bool)
    uniform_visibility = np.zeros((num_uniform, EXPECTED_LANDMARK_COUNT), dtype=np.float32)

    # For each uniform timestamp, find surrounding original frames
    right_indices = np.searchsorted(timestamps, uniform_timestamps, side="right")

    for k, t_k in enumerate(uniform_timestamps):
        idx_r = right_indices[k]
        if idx_r == 0:
            uniform_coords[k] = coords[0]
            uniform_validity[k] = validity[0]
            uniform_visibility[k] = visibility[0]
        elif idx_r >= len(timestamps):
            uniform_coords[k] = coords[-1]
            uniform_validity[k] = validity[-1]
            uniform_visibility[k] = visibility[-1]
        else:
            idx_l = idx_r - 1
            t_l = timestamps[idx_l]
            t_r = timestamps[idx_r]
            gap = t_r - t_l

            if gap <= 0:
                uniform_coords[k] = coords[idx_l]
                uniform_validity[k] = validity[idx_l]
                uniform_visibility[k] = visibility[idx_l]
            elif gap > max_gap_interpolation_ms:
                # Gap too large: do not smoothly interpolate across missing subject
                uniform_coords[k] = coords[idx_l]
                uniform_validity[k] = False  # Mark invalid
                uniform_visibility[k] = 0.0
            else:
                alpha = (t_k - t_l) / float(gap)
                uniform_coords[k] = (1.0 - alpha) * coords[idx_l] + alpha * coords[idx_r]
                # Valid only if both surrounding frames had valid landmarks
                uniform_validity[k] = validity[idx_l] & validity[idx_r]
                uniform_visibility[k] = (1.0 - alpha) * visibility[idx_l] + alpha * visibility[idx_r]

    return uniform_timestamps.astype(np.int64), uniform_coords, uniform_validity, uniform_visibility


def normalize_coordinates_and_extract_anchor(
    coords: np.ndarray,
    validity: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute person-relative normalization (hip-centered, torso-scaled) and global hip Y.

    Args:
        coords: (T, 33, 3)
        validity: (T, 33) bool

    Returns:
        coords_norm: (T, 33, 3)
        hip_global_y: (T,)
    """
    T = coords.shape[0]
    coords_norm = np.zeros_like(coords)
    hip_global_y = np.zeros(T, dtype=np.float32)

    for t in range(T):
        # Hip center
        hip_valid = validity[t, LEFT_HIP] and validity[t, RIGHT_HIP]
        if hip_valid:
            hip_center = (coords[t, LEFT_HIP] + coords[t, RIGHT_HIP]) / 2.0
        elif validity[t, LEFT_HIP]:
            hip_center = coords[t, LEFT_HIP]
        elif validity[t, RIGHT_HIP]:
            hip_center = coords[t, RIGHT_HIP]
        else:
            # Fallback to mean of any valid landmarks or origin
            valid_pts = coords[t, validity[t]]
            hip_center = valid_pts.mean(axis=0) if len(valid_pts) > 0 else np.zeros(3)

        hip_global_y[t] = hip_center[1]

        # Shoulder center
        sh_valid = validity[t, LEFT_SHOULDER] and validity[t, RIGHT_SHOULDER]
        if sh_valid:
            sh_center = (coords[t, LEFT_SHOULDER] + coords[t, RIGHT_SHOULDER]) / 2.0
        elif validity[t, LEFT_SHOULDER]:
            sh_center = coords[t, LEFT_SHOULDER]
        elif validity[t, RIGHT_SHOULDER]:
            sh_center = coords[t, RIGHT_SHOULDER]
        else:
            sh_center = None

        # Torso scale: distance between mid-hip and mid-shoulder
        if sh_center is not None:
            torso_len = float(np.linalg.norm(sh_center - hip_center))
        else:
            torso_len = 0.0

        scale = torso_len if torso_len > 0.05 else 0.25  # Fallback scale

        coords_norm[t] = (coords[t] - hip_center) / scale

    return coords_norm, hip_global_y


def preprocess_sequence(
    sequence: PoseSequence,
    target_cadence_hz: float = 20.0,
    max_gap_interpolation_ms: int = 350,
    min_landmark_visibility: float = 0.3,
) -> PreprocessedSequence:
    """Run full deterministic preprocessing pipeline on a PoseSequence."""
    raw_timestamps, raw_coords, raw_validity, raw_visibility = frames_to_numpy(
        sequence.frames, min_visibility=min_landmark_visibility
    )

    resampled_ts, resampled_coords, resampled_val, resampled_vis = resample_temporal_sequence(
        raw_timestamps,
        raw_coords,
        raw_validity,
        raw_visibility,
        target_cadence_hz=target_cadence_hz,
        max_gap_interpolation_ms=max_gap_interpolation_ms,
    )

    coords_norm, hip_global_y = normalize_coordinates_and_extract_anchor(
        resampled_coords, resampled_val
    )

    metadata = {
        "capture_id": sequence.capture_id,
        "raw_frame_count": len(sequence.frames),
        "preprocessed_frame_count": len(resampled_ts),
        "target_cadence_hz": target_cadence_hz,
    }

    return PreprocessedSequence(
        sequence_id=sequence.capture_id,
        timestamps_ms=resampled_ts,
        coords_norm=coords_norm,
        coords_raw=resampled_coords,
        validity_mask=resampled_val,
        visibility=resampled_vis,
        hip_global_y=hip_global_y,
        cadence_hz=target_cadence_hz,
        metadata=metadata,
    )
