"""Tests for grouped train/val/test splitting and leakage assertions."""

import pytest
from fall_detection.splits import (
    DataLeakageError,
    assert_no_leakage,
    create_grouped_splits,
)


def test_grouped_splitting_no_subject_leakage():
    # Synthetic windows from 4 distinct subjects
    window_meta = [
        {"window_id": f"w_{i}", "sequence_id": f"seq_{i // 2}", "subject_id": f"subj_{i // 6}", "label": "fall" if i % 2 == 0 else "normal"}
        for i in range(24)
    ]

    train_idx, val_idx, test_idx, manifest = create_grouped_splits(
        window_meta, group_by="subject_id", random_seed=42
    )

    train_subjs = {window_meta[i]["subject_id"] for i in train_idx}
    val_subjs = {window_meta[i]["subject_id"] for i in val_idx}
    test_subjs = {window_meta[i]["subject_id"] for i in test_idx}

    # Strict assertion: no subject in more than 1 split
    assert len(train_subjs.intersection(val_subjs)) == 0
    assert len(train_subjs.intersection(test_subjs)) == 0
    assert len(val_subjs.intersection(test_subjs)) == 0


def test_leakage_assertion_raises_error():
    train_meta = [{"sequence_id": "seq_1", "subject_id": "subj_A"}]
    val_meta = [{"sequence_id": "seq_2", "subject_id": "subj_B"}]
    # Leak subj_A into test!
    test_leak_meta = [{"sequence_id": "seq_3", "subject_id": "subj_A"}]

    with pytest.raises(DataLeakageError):
        assert_no_leakage(train_meta, val_meta, test_leak_meta, group_by="subject_id")
