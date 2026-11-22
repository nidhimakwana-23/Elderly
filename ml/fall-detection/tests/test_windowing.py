"""Tests for temporal sliding window generation and event labelling."""

from fall_detection.preprocessing import preprocess_sequence
from fall_detection.schema import ManifestEntry
from fall_detection.windowing import (
    assign_window_label,
    generate_windows_for_sequence,
)


def test_assign_window_label_rules():
    entry_fall = ManifestEntry(
        sequence_id="seq-fall",
        path="",
        schema_version="1.0.0",
        label="fall",
        subject_id="s1",
        session_id="sess1",
        source_dataset="test",
        event_start_ms=1000,
        event_end_ms=2000,
    )

    # Window heavily overlapping fall event [1000, 2000] -> 'fall'
    assert (
        assign_window_label(
            800, 2200, entry_fall, fall_event_min_overlap_ms=500, ambiguous_margin_ms=200
        )
        == "fall"
    )

    # Window completely before fall event (end <= 1000 - 200 = 800) -> 'normal'
    assert (
        assign_window_label(
            0, 750, entry_fall, fall_event_min_overlap_ms=500, ambiguous_margin_ms=200
        )
        == "normal"
    )

    # Window completely after fall event (start >= 2000 + 200 = 2200) -> 'normal'
    assert (
        assign_window_label(
            2300, 3500, entry_fall, fall_event_min_overlap_ms=500, ambiguous_margin_ms=200
        )
        == "normal"
    )

    # Window touching ambiguous boundary (overlap < 500ms, but inside margin) -> 'ambiguous'
    assert (
        assign_window_label(
            600, 1100, entry_fall, fall_event_min_overlap_ms=500, ambiguous_margin_ms=200
        )
        == "ambiguous"
    )


def test_generate_windows(sample_fall_sequence):
    seq, entry = sample_fall_sequence
    preprocessed = preprocess_sequence(seq, target_cadence_hz=20.0)

    windows = generate_windows_for_sequence(
        preprocessed,
        entry,
        window_duration_s=2.5,
        window_stride_s=0.5,
        min_frames_per_window=20,
    )

    assert len(windows) > 0
    labels = {w.label for w in windows}
    assert "fall" in labels  # Must contain fall window
    for w in windows:
        assert w.subject_id == entry.subject_id
        assert w.sequence_id == entry.sequence_id
        assert w.end_ms > w.start_ms
        assert len(w.timestamps_ms) >= 20
