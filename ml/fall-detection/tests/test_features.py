"""Tests for feature extraction and feature matrix construction."""

import numpy as np
from fall_detection.features import (
    ALL_FEATURE_NAMES,
    GEOMETRY_FEATURE_NAMES,
    TEMPORAL_FEATURE_NAMES,
    compute_frame_geometry,
    extract_features_from_window,
    windows_to_feature_matrix,
)
from fall_detection.preprocessing import preprocess_sequence
from fall_detection.windowing import generate_windows_for_sequence


def test_compute_frame_geometry_upright():
    # Synthetic upright pose
    coords = np.zeros((33, 3), dtype=np.float32)
    # Shoulders at y=0.3
    coords[11, :2] = [0.4, 0.3]
    coords[12, :2] = [0.6, 0.3]
    # Hips at y=0.6 (directly below shoulders)
    coords[23, :2] = [0.45, 0.6]
    coords[24, :2] = [0.55, 0.6]
    validity = np.ones(33, dtype=bool)

    angle, aspect_ratio, torso_len, bbox_h = compute_frame_geometry(coords, validity)
    assert abs(angle) < 1.0  # Angle with vertical is 0 degrees
    assert torso_len > 0.25


def test_compute_frame_geometry_horizontal():
    # Synthetic horizontal pose (lying down)
    coords = np.zeros((33, 3), dtype=np.float32)
    # Shoulders at (x=0.2, y=0.8)
    coords[11, :2] = [0.2, 0.75]
    coords[12, :2] = [0.2, 0.85]
    # Hips at (x=0.6, y=0.8)
    coords[23, :2] = [0.6, 0.75]
    coords[24, :2] = [0.6, 0.85]
    validity = np.ones(33, dtype=bool)

    angle, aspect_ratio, torso_len, bbox_h = compute_frame_geometry(coords, validity)
    # Mid-shoulder=(0.2, 0.8), Mid-hip=(0.6, 0.8) -> vector=(0.4, 0.0) -> angle with (0, 1) is 90 deg
    assert abs(angle - 90.0) < 2.0


def test_extract_features_from_window(sample_fall_sequence):
    seq, entry = sample_fall_sequence
    preprocessed = preprocess_sequence(seq, target_cadence_hz=20.0)
    windows = generate_windows_for_sequence(preprocessed, entry)
    assert len(windows) > 0

    fall_win = next(w for w in windows if w.label == "fall")
    features = extract_features_from_window(fall_win, feature_set="geometry_temporal_quality")

    for fname in ALL_FEATURE_NAMES:
        assert fname in features
        assert not np.isnan(features[fname])
        assert not np.isinf(features[fname])

    # A fall window must exhibit high downward velocity or significant angle rate
    assert features["torso_angle_max"] > 45.0
    assert features["hip_max_downward_velocity"] > 0.0


def test_windows_to_feature_matrix_excludes_ambiguous(sample_fall_sequence):
    seq, entry = sample_fall_sequence
    preprocessed = preprocess_sequence(seq, target_cadence_hz=20.0)
    windows = generate_windows_for_sequence(preprocessed, entry)

    # Force one window to ambiguous
    windows[0].label = "ambiguous"
    X, y, f_names, meta = windows_to_feature_matrix(windows)

    # Ambiguous window must not be in X or meta
    assert len(meta) == len(windows) - 1
    assert "ambiguous" not in [m["label"] for m in meta]
    assert X.shape[0] == len(meta)
    assert X.shape[1] == len(f_names)
