"""Tests for temporal resampling and coordinate normalization."""

import numpy as np
from fall_detection.preprocessing import (
    normalize_coordinates_and_extract_anchor,
    preprocess_sequence,
    resample_temporal_sequence,
)


def test_temporal_resampling_uniformity():
    # Variable non-uniform timestamps
    raw_timestamps = np.array([0, 31, 65, 102, 130, 200], dtype=np.int64)
    raw_coords = np.zeros((6, 33, 3), dtype=np.float32)
    raw_coords[:, :, 1] = np.linspace(0.2, 0.8, 6)[:, None]  # Linear downward trend
    raw_validity = np.ones((6, 33), dtype=bool)
    raw_visibility = np.ones((6, 33), dtype=np.float32)

    target_hz = 20.0  # 50 ms step
    uniform_ts, uniform_coords, uniform_val, uniform_vis = resample_temporal_sequence(
        raw_timestamps,
        raw_coords,
        raw_validity,
        raw_visibility,
        target_cadence_hz=target_hz,
        max_gap_interpolation_ms=350,
    )

    deltas = np.diff(uniform_ts)
    # Check that deltas are strictly uniform 50 ms
    assert np.all(deltas == 50)
    assert uniform_coords.shape[0] == len(uniform_ts)
    assert np.all(uniform_val)


def test_resampling_rejects_large_gaps():
    # Sequence with a 1000 ms gap between t=100 and t=1100
    raw_timestamps = np.array([0, 50, 100, 1100, 1150, 1200], dtype=np.int64)
    raw_coords = np.zeros((6, 33, 3), dtype=np.float32)
    raw_validity = np.ones((6, 33), dtype=bool)
    raw_visibility = np.ones((6, 33), dtype=np.float32)

    uniform_ts, uniform_coords, uniform_val, uniform_vis = resample_temporal_sequence(
        raw_timestamps,
        raw_coords,
        raw_validity,
        raw_visibility,
        target_cadence_hz=20.0,
        max_gap_interpolation_ms=300,
    )

    # In the middle of the large gap (e.g. t=500), validity should be False!
    gap_indices = np.where((uniform_ts > 100) & (uniform_ts < 1100))[0]
    assert len(gap_indices) > 0
    assert not np.any(uniform_val[gap_indices])  # Must not interpolate across gap


def test_coordinate_normalization(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    preprocessed = preprocess_sequence(seq, target_cadence_hz=20.0)

    assert preprocessed.coords_norm.shape[1] == 33
    assert preprocessed.coords_norm.shape[2] == 3
    # Check that hip midpoint in normalized coords is near (0, 0)
    mid_hip_norm = (preprocessed.coords_norm[:, 23] + preprocessed.coords_norm[:, 24]) / 2.0
    np.testing.assert_allclose(mid_hip_norm[:, :2], 0.0, atol=1e-3)

    # Check global hip Y is preserved and within [0, 1]
    assert np.all(preprocessed.hip_global_y >= 0.0)
    assert np.all(preprocessed.hip_global_y <= 1.0)
