"""Spatial and temporal feature extraction from pose windows."""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

import numpy as np

from .schema import EXPECTED_LANDMARK_COUNT
from .windowing import WindowData

# Key landmark indices (MediaPipe Pose topology)
NOSE = 0
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

GEOMETRY_FEATURE_NAMES = [
    "torso_angle_mean",
    "torso_angle_max",
    "torso_angle_min",
    "torso_angle_range",
    "aspect_ratio_mean",
    "aspect_ratio_max",
    "aspect_ratio_min",
    "hip_y_mean",
    "hip_y_max",
    "horizontal_duration_ratio",
    "torso_length_mean",
]

TEMPORAL_FEATURE_NAMES = [
    "torso_angle_max_rate",
    "hip_y_delta",
    "hip_max_downward_velocity",
    "hip_vertical_acceleration",
    "aspect_ratio_delta",
    "post_drop_stability",
    "motion_energy_total",
]

QUALITY_FEATURE_NAMES = [
    "mean_landmark_visibility",
    "valid_landmark_fraction",
    "low_quality_frame_count",
]

ALL_FEATURE_NAMES = (
    GEOMETRY_FEATURE_NAMES + TEMPORAL_FEATURE_NAMES + QUALITY_FEATURE_NAMES
)

FEATURE_SETS = {
    "geometry_only": GEOMETRY_FEATURE_NAMES,
    "geometry_temporal": GEOMETRY_FEATURE_NAMES + TEMPORAL_FEATURE_NAMES,
    "geometry_temporal_quality": ALL_FEATURE_NAMES,
}


def compute_frame_geometry(
    coords: np.ndarray,
    validity: np.ndarray,
) -> Tuple[float, float, float, float]:
    """Compute 2D torso angle (deg), body aspect ratio, torso length, and bounding box height.

    Args:
        coords: (33, 3) landmarks in frame coordinates
        validity: (33,) bool validity mask

    Returns:
        torso_angle_deg: angle from vertical in degrees [0, 180]
        aspect_ratio: width / height
        torso_len: Euclidean distance between mid-shoulder and mid-hip
        bbox_height: height of body bounding box
    """
    # Mid-hip
    hip_valid = validity[LEFT_HIP] and validity[RIGHT_HIP]
    if hip_valid:
        hip_mid = (coords[LEFT_HIP, :2] + coords[RIGHT_HIP, :2]) / 2.0
    elif validity[LEFT_HIP]:
        hip_mid = coords[LEFT_HIP, :2]
    elif validity[RIGHT_HIP]:
        hip_mid = coords[RIGHT_HIP, :2]
    else:
        hip_mid = np.array([0.5, 0.8], dtype=np.float32)

    # Mid-shoulder
    sh_valid = validity[LEFT_SHOULDER] and validity[RIGHT_SHOULDER]
    if sh_valid:
        sh_mid = (coords[LEFT_SHOULDER, :2] + coords[RIGHT_SHOULDER, :2]) / 2.0
    elif validity[LEFT_SHOULDER]:
        sh_mid = coords[LEFT_SHOULDER, :2]
    elif validity[RIGHT_SHOULDER]:
        sh_mid = coords[RIGHT_SHOULDER, :2]
    else:
        sh_mid = np.array([0.5, 0.4], dtype=np.float32)

    # Torso vector from shoulder to hip (downward in standard screen coords where y increases down)
    torso_vec = hip_mid - sh_mid
    torso_len = float(np.linalg.norm(torso_vec))

    # Angle with vertical unit vector (0, 1)
    if torso_len > 1e-4:
        cos_theta = torso_vec[1] / torso_len
        cos_theta = max(-1.0, min(1.0, float(cos_theta)))
        torso_angle_deg = math.degrees(math.acos(cos_theta))
    else:
        torso_angle_deg = 0.0

    # Body bounding box from valid landmarks
    valid_idx = np.where(validity)[0]
    if len(valid_idx) >= 4:
        pts = coords[valid_idx, :2]
        x_min, y_min = pts.min(axis=0)
        x_max, y_max = pts.max(axis=0)
        w = max(1e-4, float(x_max - x_min))
        h = max(1e-4, float(y_max - y_min))
        aspect_ratio = w / h
    else:
        aspect_ratio = 0.4
        h = 0.6

    return torso_angle_deg, aspect_ratio, torso_len, h


def extract_features_from_window(
    window: WindowData,
    feature_set: str = "geometry_temporal_quality",
    smoothing_window: int = 3,
) -> Dict[str, float]:
    """Extract spatial, temporal, and quality features for a single temporal window."""
    T = len(window.timestamps_ms)
    coords_raw = window.coords_raw
    validity = window.validity_mask
    visibility = window.visibility
    hip_y = window.hip_global_y

    torso_angles = np.zeros(T, dtype=np.float32)
    aspect_ratios = np.zeros(T, dtype=np.float32)
    torso_lengths = np.zeros(T, dtype=np.float32)
    bbox_heights = np.zeros(T, dtype=np.float32)

    for t in range(T):
        t_ang, a_rat, t_len, b_h = compute_frame_geometry(coords_raw[t], validity[t])
        torso_angles[t] = t_ang
        aspect_ratios[t] = a_rat
        torso_lengths[t] = t_len
        bbox_heights[t] = b_h

    # Optional temporal smoothing
    if smoothing_window > 1 and T >= smoothing_window:
        kernel = np.ones(smoothing_window) / smoothing_window
        torso_angles = np.convolve(torso_angles, kernel, mode="same")
        hip_y = np.convolve(hip_y, kernel, mode="same")

    # Time steps for derivatives (seconds)
    timestamps_s = window.timestamps_ms / 1000.0
    dt = np.diff(timestamps_s)
    dt[dt <= 0] = 0.05  # Prevent division by zero

    # First derivatives
    hip_y_vel = np.diff(hip_y) / dt  # Positive means moving downwards (falling)
    torso_ang_vel = np.diff(torso_angles) / dt

    # Second derivative (acceleration)
    if len(hip_y_vel) > 1:
        dt_mid = (dt[:-1] + dt[1:]) / 2.0
        dt_mid[dt_mid <= 0] = 0.05
        hip_accel = np.diff(hip_y_vel) / dt_mid
        max_downward_accel = float(np.max(hip_accel)) if len(hip_accel) > 0 else 0.0
    else:
        max_downward_accel = 0.0

    # Motion energy across key joints
    key_joints = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP]
    motion_energy = 0.0
    for j in key_joints:
        j_diff = np.diff(coords_raw[:, j, :2], axis=0)
        motion_energy += float(np.mean(j_diff**2))

    # Post-drop stability (motion in the last third of the window)
    last_third_idx = int(2 * T / 3)
    if last_third_idx < T - 1:
        post_drop_stability = float(np.mean(np.abs(hip_y_vel[last_third_idx:])))
    else:
        post_drop_stability = float(np.mean(np.abs(hip_y_vel)))

    # Horizontal duration ratio (torso angle > 60 degrees)
    horizontal_duration_ratio = float(np.mean(torso_angles > 60.0))

    # Low-quality frame count (frames with < 11 valid landmarks)
    valid_landmarks_per_frame = np.sum(validity, axis=1)
    low_quality_frames = int(np.sum(valid_landmarks_per_frame < 11))

    features: Dict[str, float] = {
        # Geometry
        "torso_angle_mean": float(np.mean(torso_angles)),
        "torso_angle_max": float(np.max(torso_angles)),
        "torso_angle_min": float(np.min(torso_angles)),
        "torso_angle_range": float(np.ptp(torso_angles)),
        "aspect_ratio_mean": float(np.mean(aspect_ratios)),
        "aspect_ratio_max": float(np.max(aspect_ratios)),
        "aspect_ratio_min": float(np.min(aspect_ratios)),
        "hip_y_mean": float(np.mean(hip_y)),
        "hip_y_max": float(np.max(hip_y)),
        "horizontal_duration_ratio": horizontal_duration_ratio,
        "torso_length_mean": float(np.mean(torso_lengths)),
        # Temporal
        "torso_angle_max_rate": float(np.max(np.abs(torso_ang_vel))) if len(torso_ang_vel) > 0 else 0.0,
        "hip_y_delta": float(hip_y[-1] - hip_y[0]),
        "hip_max_downward_velocity": float(np.max(hip_y_vel)) if len(hip_y_vel) > 0 else 0.0,
        "hip_vertical_acceleration": max_downward_accel,
        "aspect_ratio_delta": float(aspect_ratios[-1] - aspect_ratios[0]),
        "post_drop_stability": post_drop_stability,
        "motion_energy_total": motion_energy,
        # Quality
        "mean_landmark_visibility": float(np.mean(visibility)),
        "valid_landmark_fraction": float(np.mean(validity)),
        "low_quality_frame_count": float(low_quality_frames),
    }

    selected_names = FEATURE_SETS.get(feature_set, ALL_FEATURE_NAMES)
    return {k: features[k] for k in selected_names if k in features}


def windows_to_feature_matrix(
    windows: List[WindowData],
    feature_set: str = "geometry_temporal_quality",
    smoothing_window: int = 3,
) -> Tuple[np.ndarray, np.ndarray, List[str], List[Dict[str, Any]]]:
    """Convert a list of WindowData objects into feature matrix X, labels y, and window metadata.

    Excludes windows marked as 'ambiguous'.
    """
    selected_names = FEATURE_SETS.get(feature_set, ALL_FEATURE_NAMES)
    rows: List[List[float]] = []
    labels: List[int] = []
    meta: List[Dict[str, Any]] = []

    for w in windows:
        if w.label == "ambiguous":
            continue

        feat_dict = extract_features_from_window(
            w, feature_set=feature_set, smoothing_window=smoothing_window
        )
        row = [feat_dict.get(fname, 0.0) for fname in selected_names]
        rows.append(row)
        labels.append(1 if w.label == "fall" else 0)
        meta.append(
            {
                "window_id": w.window_id,
                "sequence_id": w.sequence_id,
                "subject_id": w.subject_id,
                "session_id": w.session_id,
                "start_ms": w.start_ms,
                "end_ms": w.end_ms,
                "label": w.label,
                "quality_score": w.quality_score,
            }
        )

    X = np.array(rows, dtype=np.float32) if rows else np.empty((0, len(selected_names)), dtype=np.float32)
    y = np.array(labels, dtype=np.int32) if labels else np.empty((0,), dtype=np.int32)
    return X, y, selected_names, meta
