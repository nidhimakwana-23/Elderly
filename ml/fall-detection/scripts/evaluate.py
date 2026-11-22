#!/usr/bin/env python3
"""Held-out test set evaluation and error analysis script."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml

# Allow importing src/fall_detection
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fall_detection.artifacts import load_artifact_bundle
from fall_detection.evaluation import (
    compute_metrics,
    generate_evaluation_markdown,
    perform_error_analysis,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate fall-detection artifact on test set.")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/baseline.yaml",
        help="Path to YAML configuration file.",
    )
    parser.add_argument(
        "--model-dir",
        type=str,
        default=None,
        help="Optional path to model artifact bundle directory.",
    )
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.is_file():
        print(f"Error: Config file not found at {cfg_path}", file=sys.stderr)
        sys.exit(1)

    with cfg_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    base_dir = cfg_path.parent.parent

    # Locate model artifact
    if args.model_dir:
        artifact_dir = Path(args.model_dir)
    else:
        selected_model = config.get("training", {}).get("selected_model", "random_forest")
        artifact_dir = base_dir / config.get("data", {}).get("models_dir", "models") / f"{selected_model}_baseline"

    if not artifact_dir.is_dir():
        print(f"Error: Model artifact directory not found at {artifact_dir}", file=sys.stderr)
        print("Please run scripts/train.py first.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading artifact bundle from: {artifact_dir}")
    pipe, metadata = load_artifact_bundle(artifact_dir)
    threshold = float(metadata.get("optimal_threshold", 0.5))
    model_name = metadata.get("model_name", "model")

    # Load test dataset
    processed_rel = config.get("data", {}).get("processed_dir", "data/processed")
    dataset_path = base_dir / processed_rel / "dataset.npz"
    meta_path = base_dir / processed_rel / "windows_metadata.json"

    if not dataset_path.is_file():
        print(f"Error: Processed dataset not found at {dataset_path}", file=sys.stderr)
        sys.exit(1)

    data = np.load(dataset_path, allow_pickle=True)
    X_test = data["X_test"]
    y_test = data["y_test"]

    test_meta = []
    if meta_path.is_file():
        with meta_path.open("r", encoding="utf-8") as f:
            win_meta = json.load(f)
            test_meta = win_meta.get("test_windows", [])

    print(f"Test split samples: X={X_test.shape}, y_distribution={np.bincount(y_test) if len(y_test) > 0 else []}")

    if len(X_test) == 0:
        print("Warning: Test split is empty. Nothing to evaluate.")
        sys.exit(0)

    # Inference on test split
    test_probs = pipe.predict_proba(X_test)[:, 1]
    test_metrics = compute_metrics(y_test, test_probs, threshold=threshold)
    error_analysis = perform_error_analysis(y_test, test_probs, test_meta, threshold=threshold)

    print(f"\nHeld-out Test Split Results (at validation threshold {threshold:.4f}):")
    print(f"- F1 Score:          {test_metrics.f1:.4f}")
    print(f"- Recall:            {test_metrics.recall:.4f}")
    print(f"- Specificity:       {test_metrics.specificity:.4f}")
    print(f"- Precision:         {test_metrics.precision:.4f}")
    print(f"- Balanced Accuracy: {test_metrics.balanced_accuracy:.4f}")
    print(f"- False Positives:   {len(error_analysis['false_positives'])}")
    print(f"- False Negatives:   {len(error_analysis['false_negatives'])}")

    # Save reports
    reports_dir = base_dir / config.get("data", {}).get("reports_dir", "reports")
    reports_dir.mkdir(parents=True, exist_ok=True)

    json_report = {
        "model_name": model_name,
        "model_version": metadata.get("model_version"),
        "operating_threshold": threshold,
        "metrics": test_metrics.to_dict(),
        "error_analysis": error_analysis,
    }

    report_json_path = reports_dir / "test_evaluation_report.json"
    with report_json_path.open("w", encoding="utf-8") as f:
        json.dump(json_report, f, indent=2)
    print(f"\nSaved test evaluation JSON to: {report_json_path}")

    # Generate Markdown summary
    from fall_detection.evaluation import EvaluationMetrics

    val_metrics_dict = metadata.get("validation_metrics", {})
    val_cm = val_metrics_dict.get("confusion_matrix", {})
    val_metrics_obj = EvaluationMetrics(
        total_samples=val_metrics_dict.get("total_samples", 0),
        fall_samples=val_metrics_dict.get("fall_samples", 0),
        normal_samples=val_metrics_dict.get("normal_samples", 0),
        threshold=val_metrics_dict.get("threshold", threshold),
        true_positives=val_cm.get("tp", 0),
        false_positives=val_cm.get("fp", 0),
        true_negatives=val_cm.get("tn", 0),
        false_negatives=val_cm.get("fn", 0),
        precision=val_metrics_dict.get("precision", 0.0),
        recall=val_metrics_dict.get("recall", 0.0),
        specificity=val_metrics_dict.get("specificity", 0.0),
        f1=val_metrics_dict.get("f1", 0.0),
        balanced_accuracy=val_metrics_dict.get("balanced_accuracy", 0.0),
        roc_auc=val_metrics_dict.get("roc_auc"),
        pr_auc=val_metrics_dict.get("pr_auc"),
    )

    md_content = generate_evaluation_markdown(
        model_name=model_name,
        val_metrics=val_metrics_obj,
        test_metrics=test_metrics,
        error_summary=error_analysis,
    )
    report_md_path = reports_dir / "evaluation_summary.md"
    with report_md_path.open("w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved evaluation markdown summary to: {report_md_path}")


if __name__ == "__main__":
    main()
