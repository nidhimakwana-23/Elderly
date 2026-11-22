"""Tests for schema definitions and serialization contracts."""

import pytest
from fall_detection.schema import (
    CURRENT_SCHEMA_VERSION,
    EXPECTED_LANDMARK_COUNT,
    MEDIAPIPE_LANDMARK_NAMES,
    PoseFrame,
    PoseFrameQuality,
    PoseLandmark,
    PoseSequence,
    PoseSequenceMetadata,
)


def test_schema_constants():
    assert CURRENT_SCHEMA_VERSION == "1.0.0"
    assert EXPECTED_LANDMARK_COUNT == 33
    assert len(MEDIAPIPE_LANDMARK_NAMES) == 33
    assert MEDIAPIPE_LANDMARK_NAMES[0] == "nose"
    assert MEDIAPIPE_LANDMARK_NAMES[11] == "left_shoulder"
    assert MEDIAPIPE_LANDMARK_NAMES[12] == "right_shoulder"
    assert MEDIAPIPE_LANDMARK_NAMES[23] == "left_hip"
    assert MEDIAPIPE_LANDMARK_NAMES[24] == "right_hip"


def test_landmark_validity_and_serialization():
    lm = PoseLandmark(x=0.5, y=0.5, z=-0.1, visibility=0.9, presence=0.95)
    assert lm.is_valid(min_visibility=0.3) is True

    d = lm.to_dict()
    assert d["x"] == 0.5
    assert d["y"] == 0.5
    assert d["z"] == -0.1
    assert d["visibility"] == 0.9

    lm2 = PoseLandmark.from_dict(d)
    assert lm2.x == lm.x
    assert lm2.y == lm.y
    assert lm2.z == lm.z
    assert lm2.visibility == lm.visibility


def test_invalid_landmark_handling():
    lm_nan = PoseLandmark(x=float("nan"), y=0.5)
    assert lm_nan.is_valid() is False

    lm_inf = PoseLandmark(x=0.5, y=float("inf"))
    assert lm_inf.is_valid() is False

    lm_low_vis = PoseLandmark(x=0.5, y=0.5, visibility=0.1)
    assert lm_low_vis.is_valid(min_visibility=0.3) is False


def test_sequence_roundtrip_dict():
    lms = [PoseLandmark(x=0.1, y=0.2) for _ in range(EXPECTED_LANDMARK_COUNT)]
    q = PoseFrameQuality(pose_detected=True, valid_landmark_count=33, expected_landmark_count=33)
    frame = PoseFrame(timestamp_ms=100, frame_index=0, landmarks=lms, quality=q)
    meta = PoseSequenceMetadata(capture_cadence_fps=30.0, total_frames=1)

    seq = PoseSequence(
        schema_version="1.0.0",
        capture_id="cap-001",
        started_at="2026-11-22T00:00:00Z",
        frames=[frame],
        metadata=meta,
    )

    data = seq.to_dict()
    assert data["schemaVersion"] == "1.0.0"
    assert data["captureId"] == "cap-001"
    assert len(data["frames"]) == 1
    assert len(data["frames"][0]["landmarks"]) == 33

    rebuilt = PoseSequence.from_dict(data)
    assert rebuilt.capture_id == "cap-001"
    assert len(rebuilt.frames) == 1
    assert rebuilt.frames[0].timestamp_ms == 100
    assert rebuilt.frames[0].quality.valid_landmark_count == 33
