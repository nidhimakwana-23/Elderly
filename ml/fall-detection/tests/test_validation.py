"""Tests for sequence and manifest validation."""

from fall_detection.schema import (
    EXPECTED_LANDMARK_COUNT,
    ManifestEntry,
    PoseFrame,
    PoseFrameQuality,
    PoseLandmark,
    PoseSequence,
)
from fall_detection.validation import (
    validate_manifest_entry,
    validate_pose_sequence,
)


def test_valid_sequence_passes(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    report = validate_pose_sequence(seq)
    assert report.is_valid is True
    assert len(report.errors) == 0
    assert report.stats["frameCount"] > 0
    assert "estimatedFps" in report.stats


def test_unsupported_schema_version_fails(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    seq.schema_version = "2.0.0"  # Unsupported
    report = validate_pose_sequence(seq)
    assert report.is_valid is False
    assert any("Unsupported schemaVersion" in e for e in report.errors)


def test_non_monotonic_timestamps_fail(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    # Invert timestamp order of frame 1 and 2
    seq.frames[2].timestamp_ms = seq.frames[1].timestamp_ms - 50
    report = validate_pose_sequence(seq)
    assert report.is_valid is False
    assert any("timestamp order reversals" in e for e in report.errors)


def test_invalid_landmark_count_fails(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    # Drop one landmark from frame 0
    seq.frames[0].landmarks = seq.frames[0].landmarks[:32]
    report = validate_pose_sequence(seq)
    assert report.is_valid is False
    assert any("expected 33" in e for e in report.errors)


def test_non_finite_coordinate_fails(sample_standing_sequence):
    seq, _ = sample_standing_sequence
    seq.frames[0].landmarks[0].x = float("nan")
    report = validate_pose_sequence(seq)
    assert report.is_valid is False
    assert any("non-finite coordinates" in e for e in report.errors)


def test_manifest_validation_invalid_label(tmp_path):
    entry = ManifestEntry(
        sequence_id="test-seq",
        path="nonexistent.json",
        schema_version="1.0.0",
        label="unknown_label",  # Invalid label
        subject_id="s1",
        session_id="sess1",
        source_dataset="test",
    )
    report = validate_manifest_entry(entry, base_dir=tmp_path)
    assert report.is_valid is False
    assert any("Invalid label" in e for e in report.errors)
    assert any("does not exist" in e for e in report.errors)
