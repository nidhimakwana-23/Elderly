"""Tests for evaluation metrics and threshold optimization."""

import numpy as np
from fall_detection.evaluation import (
    compute_metrics,
    perform_error_analysis,
    select_optimal_threshold,
)


def test_compute_metrics():
    y_true = np.array([1, 1, 0, 0], dtype=np.int32)
    y_probs = np.array([0.9, 0.4, 0.8, 0.1], dtype=np.float32)

    # At threshold 0.5:
    # Pred: [1, 0, 1, 0]
    # TP=1, FP=1, TN=1, FN=1
    m = compute_metrics(y_true, y_probs, threshold=0.5)

    assert m.true_positives == 1
    assert m.false_positives == 1
    assert m.true_negatives == 1
    assert m.false_negatives == 1
    assert m.precision == 0.5
    assert m.recall == 0.5
    assert m.specificity == 0.5
    assert m.f1 == 0.5


def test_select_optimal_threshold():
    y_true = np.array([1, 1, 1, 0, 0, 0], dtype=np.int32)
    # Clear separation: falls >= 0.75, normals <= 0.40
    y_probs = np.array([0.95, 0.85, 0.75, 0.40, 0.30, 0.15], dtype=np.float32)

    best_thresh, best_metrics, sweep = select_optimal_threshold(
        y_true, y_probs, target_metric="f1"
    )

    assert best_metrics.f1 == 1.0
    assert 0.40 <= best_thresh <= 0.75


def test_perform_error_analysis():
    y_true = np.array([1, 0], dtype=np.int32)
    # Invert predictions to create 1 FN and 1 FP
    y_probs = np.array([0.1, 0.9], dtype=np.float32)
    meta = [
        {"window_id": "win_fn", "sequence_id": "seq_1"},
        {"window_id": "win_fp", "sequence_id": "seq_2"},
    ]

    analysis = perform_error_analysis(y_true, y_probs, meta, threshold=0.5)
    assert len(analysis["false_negatives"]) == 1
    assert analysis["false_negatives"][0]["window_id"] == "win_fn"
    assert len(analysis["false_positives"]) == 1
    assert analysis["false_positives"][0]["window_id"] == "win_fp"
