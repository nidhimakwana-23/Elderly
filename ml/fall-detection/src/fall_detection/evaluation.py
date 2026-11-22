"""Model evaluation metrics, threshold selection, and error reporting."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


@dataclass
class EvaluationMetrics:
    """Standard evaluation metrics for binary fall classification."""

    total_samples: int
    fall_samples: int
    normal_samples: int
    threshold: float
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    precision: float
    recall: float
    specificity: float
    f1: float
    balanced_accuracy: float
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_samples": self.total_samples,
            "fall_samples": self.fall_samples,
            "normal_samples": self.normal_samples,
            "threshold": round(self.threshold, 4),
            "confusion_matrix": {
                "tp": self.true_positives,
                "fp": self.false_positives,
                "tn": self.true_negatives,
                "fn": self.false_negatives,
            },
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "specificity": round(self.specificity, 4),
            "f1": round(self.f1, 4),
            "balanced_accuracy": round(self.balanced_accuracy, 4),
            "roc_auc": round(self.roc_auc, 4) if self.roc_auc is not None else None,
            "pr_auc": round(self.pr_auc, 4) if self.pr_auc is not None else None,
        }


def compute_metrics(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    threshold: float = 0.5,
) -> EvaluationMetrics:
    """Compute comprehensive evaluation metrics given true labels and fall probabilities."""
    y_pred = (y_probs >= threshold).astype(int)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    total = len(y_true)
    fall_count = int(np.sum(y_true == 1))
    normal_count = int(np.sum(y_true == 0))

    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))

    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None

    # ROC / PR AUC can only be calculated if both classes exist in y_true
    if len(np.unique(y_true)) > 1:
        try:
            roc_auc = float(roc_auc_score(y_true, y_probs))
            pr_auc = float(average_precision_score(y_true, y_probs))
        except Exception:
            pass

    return EvaluationMetrics(
        total_samples=total,
        fall_samples=fall_count,
        normal_samples=normal_count,
        threshold=threshold,
        true_positives=int(tp),
        false_positives=int(fp),
        true_negatives=int(tn),
        false_negatives=int(fn),
        precision=prec,
        recall=rec,
        specificity=spec,
        f1=f1,
        balanced_accuracy=bal_acc,
        roc_auc=roc_auc,
        pr_auc=pr_auc,
    )


def select_optimal_threshold(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    target_metric: str = "f1",
    candidate_thresholds: Optional[List[float]] = None,
) -> Tuple[float, EvaluationMetrics, List[Dict[str, Any]]]:
    """Sweep decision thresholds on validation data to select optimal threshold."""
    if candidate_thresholds is None:
        candidate_thresholds = [round(x, 2) for x in np.arange(0.1, 0.95, 0.05)]

    best_thresh = 0.5
    best_score = -1.0
    best_metrics: Optional[EvaluationMetrics] = None
    sweep_results: List[Dict[str, Any]] = []

    for thresh in candidate_thresholds:
        m = compute_metrics(y_true, y_probs, threshold=thresh)
        score = getattr(m, target_metric, m.f1)
        sweep_results.append(
            {
                "threshold": thresh,
                "precision": round(m.precision, 4),
                "recall": round(m.recall, 4),
                "specificity": round(m.specificity, 4),
                "f1": round(m.f1, 4),
                "balanced_accuracy": round(m.balanced_accuracy, 4),
            }
        )

        if score > best_score:
            best_score = score
            best_thresh = thresh
            best_metrics = m

    if best_metrics is None:
        best_metrics = compute_metrics(y_true, y_probs, threshold=0.5)

    return best_thresh, best_metrics, sweep_results


def perform_error_analysis(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    window_meta: List[Dict[str, Any]],
    threshold: float = 0.5,
) -> Dict[str, List[Dict[str, Any]]]:
    """Analyze false positives and false negatives."""
    y_pred = (y_probs >= threshold).astype(int)

    false_positives: List[Dict[str, Any]] = []
    false_negatives: List[Dict[str, Any]] = []

    for i in range(len(y_true)):
        meta = window_meta[i] if i < len(window_meta) else {}
        prob = float(y_probs[i])
        true_label = int(y_true[i])
        pred_label = int(y_pred[i])

        record = {
            "window_id": meta.get("window_id", f"win_{i}"),
            "sequence_id": meta.get("sequence_id", "unknown"),
            "subject_id": meta.get("subject_id", "unknown"),
            "session_id": meta.get("session_id", "unknown"),
            "start_ms": meta.get("start_ms"),
            "end_ms": meta.get("end_ms"),
            "score": round(prob, 4),
            "threshold": round(threshold, 4),
        }

        if true_label == 0 and pred_label == 1:
            false_positives.append(record)
        elif true_label == 1 and pred_label == 0:
            false_negatives.append(record)

    return {
        "false_positives": false_positives,
        "false_negatives": false_negatives,
    }


def generate_evaluation_markdown(
    model_name: str,
    val_metrics: EvaluationMetrics,
    test_metrics: Optional[EvaluationMetrics],
    error_summary: Dict[str, Any],
) -> str:
    """Generate a readable Markdown report of evaluation results."""
    md = [
        f"# Evaluation Report — {model_name}",
        "",
        "## Validation Split Results (Threshold Selection)",
        f"- Operating Threshold: `{val_metrics.threshold}`",
        f"- F1 Score: `{val_metrics.f1:.4f}`",
        f"- Recall (Sensitivity): `{val_metrics.recall:.4f}`",
        f"- Specificity: `{val_metrics.specificity:.4f}`",
        f"- Precision: `{val_metrics.precision:.4f}`",
        f"- Balanced Accuracy: `{val_metrics.balanced_accuracy:.4f}`",
        f"- ROC-AUC: `{val_metrics.roc_auc if val_metrics.roc_auc is not None else 'N/A'}`",
        "",
        "### Validation Confusion Matrix",
        "| | Predicted Normal | Predicted Fall |",
        "|---|---|---|",
        f"| **Actual Normal** | {val_metrics.true_negatives} | {val_metrics.false_positives} |",
        f"| **Actual Fall** | {val_metrics.false_negatives} | {val_metrics.true_positives} |",
        "",
    ]

    if test_metrics:
        md.extend(
            [
                "## Final Held-out Test Split Results",
                f"- Applied Validation Threshold: `{test_metrics.threshold}`",
                f"- F1 Score: `{test_metrics.f1:.4f}`",
                f"- Recall (Sensitivity): `{test_metrics.recall:.4f}`",
                f"- Specificity: `{test_metrics.specificity:.4f}`",
                f"- Precision: `{test_metrics.precision:.4f}`",
                f"- Balanced Accuracy: `{test_metrics.balanced_accuracy:.4f}`",
                f"- ROC-AUC: `{test_metrics.roc_auc if test_metrics.roc_auc is not None else 'N/A'}`",
                "",
                "### Test Confusion Matrix",
                "| | Predicted Normal | Predicted Fall |",
                "|---|---|---|",
                f"| **Actual Normal** | {test_metrics.true_negatives} | {test_metrics.false_positives} |",
                f"| **Actual Fall** | {test_metrics.false_negatives} | {test_metrics.true_positives} |",
                "",
            ]
        )

    fps = error_summary.get("false_positives", [])
    fns = error_summary.get("false_negatives", [])
    md.extend(
        [
            "## Error Analysis Summary",
            f"- False Positives count: {len(fps)}",
            f"- False Negatives count: {len(fns)}",
            "",
        ]
    )

    return "\n".join(md)
