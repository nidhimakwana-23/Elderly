"""Baseline model training and comparison for fall detection."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .evaluation import (
    EvaluationMetrics,
    compute_metrics,
    select_optimal_threshold,
)


def build_pipeline(
    model_type: str = "random_forest",
    model_params: Optional[Dict[str, Any]] = None,
) -> Pipeline:
    """Build an sklearn Pipeline with median imputation, standard scaling, and classifier."""
    params = model_params or {}

    if model_type == "random_forest":
        clf = RandomForestClassifier(
            n_estimators=params.get("n_estimators", 100),
            max_depth=params.get("max_depth", 8),
            min_samples_split=params.get("min_samples_split", 4),
            class_weight=params.get("class_weight", "balanced"),
            random_state=params.get("random_state", 42),
            n_jobs=-1,
        )
    elif model_type == "logistic_regression":
        clf = LogisticRegression(
            C=params.get("C", 1.0),
            max_iter=params.get("max_iter", 1000),
            class_weight=params.get("class_weight", "balanced"),
            random_state=params.get("random_state", 42),
        )
    else:
        raise ValueError(f"Unknown model_type: '{model_type}'. Expected 'random_forest' or 'logistic_regression'.")

    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", clf),
        ]
    )


def train_and_compare_baselines(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    feature_names: List[str],
    config_models: Optional[Dict[str, Any]] = None,
    preferred_model: Optional[str] = None,
    threshold_metric: str = "f1",
) -> Tuple[Pipeline, str, float, Dict[str, Any]]:
    """Train candidate baselines, compare validation metrics, and pick the best.

    Returns:
        best_pipeline: trained scikit-learn Pipeline
        best_model_name: name of chosen model
        best_threshold: optimal threshold tuned on validation split
        comparison_report: dict comparing candidates
    """
    if len(X_train) == 0 or len(y_train) == 0:
        raise ValueError("Cannot train on empty training set.")

    candidates = ["logistic_regression", "random_forest"]
    results: Dict[str, Any] = {}
    best_pipe: Optional[Pipeline] = None
    best_model_name = ""
    best_score = -1.0
    best_threshold = 0.5

    cfg_models = config_models or {}

    for c_name in candidates:
        params = cfg_models.get(c_name, {})
        pipe = build_pipeline(model_type=c_name, model_params=params)

        # FIT ONLY ON TRAIN SET!
        pipe.fit(X_train, y_train)

        # Validation evaluation
        if len(X_val) > 0 and len(y_val) > 0:
            val_probs = pipe.predict_proba(X_val)[:, 1]
            opt_thresh, opt_metrics, sweep = select_optimal_threshold(
                y_val, val_probs, target_metric=threshold_metric
            )
            score = getattr(opt_metrics, threshold_metric, opt_metrics.f1)
        else:
            # Fallback when validation set is empty (e.g. tiny test)
            opt_thresh = 0.5
            train_probs = pipe.predict_proba(X_train)[:, 1]
            opt_metrics = compute_metrics(y_train, train_probs, threshold=opt_thresh)
            score = opt_metrics.f1
            sweep = []

        results[c_name] = {
            "optimal_threshold": opt_thresh,
            "metrics": opt_metrics.to_dict(),
            "score": score,
        }

        # Model selection: respect preferred_model if specified, or pick highest score
        if preferred_model == c_name:
            best_pipe = pipe
            best_model_name = c_name
            best_threshold = opt_thresh
            best_score = score
        elif preferred_model is None and score > best_score:
            best_score = score
            best_pipe = pipe
            best_model_name = c_name
            best_threshold = opt_thresh

    if best_pipe is None:
        best_pipe = build_pipeline("random_forest")
        best_pipe.fit(X_train, y_train)
        best_model_name = "random_forest"
        best_threshold = 0.5

    comparison_report = {
        "candidates": results,
        "selected_model": best_model_name,
        "selected_threshold": best_threshold,
        "feature_names": feature_names,
    }

    return best_pipe, best_model_name, best_threshold, comparison_report
