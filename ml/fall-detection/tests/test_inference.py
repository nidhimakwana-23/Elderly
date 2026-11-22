"""Tests for model artifact bundling and the Python inference API."""

import numpy as np
from fall_detection.artifacts import load_artifact_bundle, save_artifact_bundle
from fall_detection.features import ALL_FEATURE_NAMES
from fall_detection.inference import FallClassifier, predict_window
from fall_detection.training import build_pipeline


def test_artifact_save_and_load(tmp_path):
    pipe = build_pipeline("random_forest")
    # Fit dummy data
    X = np.ones((10, len(ALL_FEATURE_NAMES)), dtype=np.float32)
    y = np.array([0, 1] * 5, dtype=np.int32)
    pipe.fit(X, y)

    meta = {
        "model_name": "random_forest",
        "model_version": "1.0.0",
        "feature_names": ALL_FEATURE_NAMES,
        "optimal_threshold": 0.65,
    }

    out_dir = tmp_path / "model_bundle"
    save_artifact_bundle(pipe, meta, out_dir)

    loaded_pipe, loaded_meta = load_artifact_bundle(out_dir)
    assert loaded_meta["model_name"] == "random_forest"
    assert loaded_meta["optimal_threshold"] == 0.65
    assert len(loaded_meta["feature_names"]) == len(ALL_FEATURE_NAMES)
    assert hasattr(loaded_pipe, "predict_proba")


def test_inference_on_valid_frames(tmp_path, sample_fall_sequence):
    seq, _ = sample_fall_sequence
    pipe = build_pipeline("random_forest")
    X = np.ones((10, len(ALL_FEATURE_NAMES)), dtype=np.float32)
    y = np.array([0, 1] * 5, dtype=np.int32)
    pipe.fit(X, y)

    meta = {
        "model_name": "random_forest",
        "model_version": "test-v1",
        "feature_names": ALL_FEATURE_NAMES,
        "optimal_threshold": 0.50,
        "windowing_config": {"min_frames_per_window": 20},
    }
    artifact_dir = tmp_path / "test_model"
    save_artifact_bundle(pipe, meta, artifact_dir)

    clf = FallClassifier.load(artifact_dir)

    # Window of 30 frames
    window_frames = seq.frames[:30]
    result = clf.predict(window_frames)

    assert result["is_valid"] is True
    assert result["reason"] is None
    assert result["label"] in ("fall", "normal")
    assert 0.0 <= result["fall_score"] <= 1.0
    assert result["model_version"] == "test-v1"
    assert result["window"]["start_ms"] is not None
    assert result["window"]["end_ms"] is not None


def test_inference_rejects_insufficient_frames(tmp_path, sample_fall_sequence):
    seq, _ = sample_fall_sequence
    pipe = build_pipeline("random_forest")
    pipe.fit(np.ones((10, len(ALL_FEATURE_NAMES))), np.array([0, 1] * 5))
    meta = {
        "model_name": "random_forest",
        "model_version": "test-v1",
        "feature_names": ALL_FEATURE_NAMES,
        "optimal_threshold": 0.50,
        "windowing_config": {"min_frames_per_window": 25},
    }
    artifact_dir = tmp_path / "test_model"
    save_artifact_bundle(pipe, meta, artifact_dir)

    clf = FallClassifier.load(artifact_dir)

    # Only 5 frames (below min_frames_per_window=25)
    too_short_frames = seq.frames[:5]
    result = clf.predict(too_short_frames)

    # MUST NOT classify as normal! Must flag is_valid=False
    assert result["is_valid"] is False
    assert result["label"] is None
    assert "minimum is 25" in result["reason"]


def test_inference_rejects_low_quality_landmarks(tmp_path, sample_fall_sequence):
    seq, _ = sample_fall_sequence
    pipe = build_pipeline("random_forest")
    pipe.fit(np.ones((10, len(ALL_FEATURE_NAMES))), np.array([0, 1] * 5))
    meta = {
        "model_name": "random_forest",
        "model_version": "test-v1",
        "feature_names": ALL_FEATURE_NAMES,
        "optimal_threshold": 0.50,
        "windowing_config": {"min_frames_per_window": 15},
    }
    artifact_dir = tmp_path / "test_model"
    save_artifact_bundle(pipe, meta, artifact_dir)

    clf = FallClassifier.load(artifact_dir)

    # Zero visibility landmarks (occluded/invalid)
    corrupted_frames = []
    for f in seq.frames[:30]:
        corrupted_lms = [
            type(lm)(x=lm.x, y=lm.y, visibility=0.0) for lm in f.landmarks
        ]
        corrupted_frames.append(
            type(f)(
                timestamp_ms=f.timestamp_ms,
                frame_index=f.frame_index,
                landmarks=corrupted_lms,
                quality=f.quality,
            )
        )

    result = clf.predict(corrupted_frames)
    # MUST NOT classify as normal!
    assert result["is_valid"] is False
    assert result["label"] is None
    assert "Insufficient usable body landmarks" in result["reason"]
