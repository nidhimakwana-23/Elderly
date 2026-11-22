"""Tests for model training pipeline and baseline comparison."""

import numpy as np
from fall_detection.training import (
    build_pipeline,
    train_and_compare_baselines,
)


def test_build_pipeline():
    pipe_rf = build_pipeline("random_forest")
    assert "imputer" in pipe_rf.named_steps
    assert "scaler" in pipe_rf.named_steps
    assert "classifier" in pipe_rf.named_steps

    pipe_lr = build_pipeline("logistic_regression")
    assert "classifier" in pipe_lr.named_steps


def test_train_and_compare_baselines():
    rng = np.random.default_rng(42)
    # Synthetic training data: 40 samples, 10 features
    X_train = rng.normal(size=(40, 10)).astype(np.float32)
    y_train = np.array([1 if i < 20 else 0 for i in range(40)], dtype=np.int32)
    # Feature 0 separates classes
    X_train[y_train == 1, 0] += 3.0

    X_val = rng.normal(size=(20, 10)).astype(np.float32)
    y_val = np.array([1 if i < 10 else 0 for i in range(20)], dtype=np.int32)
    X_val[y_val == 1, 0] += 3.0

    feature_names = [f"f_{i}" for i in range(10)]

    pipe, best_model, thresh, comparison = train_and_compare_baselines(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        feature_names=feature_names,
        threshold_metric="f1",
    )

    assert best_model in ("random_forest", "logistic_regression")
    assert 0.0 < thresh < 1.0
    assert "random_forest" in comparison["candidates"]
    assert "logistic_regression" in comparison["candidates"]
    assert comparison["candidates"][best_model]["metrics"]["f1"] > 0.8
