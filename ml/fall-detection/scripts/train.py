#!/usr/bin/env python3
"""Baseline model training and artifact export script."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml

# Allow importing src/fall_detection
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fall_detection.artifacts import save_artifact_bundle
from fall_detection.training import train_and_compare_baselines


def main() -> None:
    parser = argparse.ArgumentParser(description="Train fall-detection baseline models.")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/baseline.yaml",
        help="Path to YAML configuration file.",
    )
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.is_file():
        print(f"Error: Config file not found at {cfg_path}", file=sys.stderr)
        sys.exit(1)

    with cfg_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    base_dir = cfg_path.parent.parent
    processed_rel = config.get("data", {}).get("processed_dir", "data/processed")
    dataset_path = base_dir / processed_rel / "dataset.npz"

    if not dataset_path.is_file():
        print(f"Error: Processed dataset not found at {dataset_path}", file=sys.stderr)
        print("Please run scripts/prepare_dataset.py first.", file=sys.stderr)
        sys.exit(1)

    data = np.load(dataset_path, allow_pickle=True)
    X_train = data["X_train"]
    y_train = data["y_train"]
    X_val = data["X_val"]
    y_val = data["y_val"]
    feature_names = list(data["feature_names"])

    print(f"Loaded training data: X={X_train.shape}, y_distribution={np.bincount(y_train)}")
    print(f"Loaded validation data: X={X_val.shape}, y_distribution={np.bincount(y_val) if len(y_val) > 0 else []}")

    train_cfg = config.get("training", {})
    eval_cfg = config.get("evaluation", {})

    pipe, model_name, threshold, comparison = train_and_compare_baselines(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        feature_names=feature_names,
        config_models=train_cfg.get("models"),
        preferred_model=train_cfg.get("selected_model"),
        threshold_metric=eval_cfg.get("threshold_metric", "f1"),
    )

    print(f"\nTraining complete.")
    print(f"Selected model: {model_name}")
    print(f"Optimal validation threshold: {threshold:.4f}")
    val_metrics = comparison["candidates"][model_name]["metrics"]
    print(f"Validation F1: {val_metrics['f1']:.4f}, Recall: {val_metrics['recall']:.4f}, Precision: {val_metrics['precision']:.4f}")

    # Save model artifact bundle
    models_dir = base_dir / config.get("data", {}).get("models_dir", "models")
    artifact_dir = models_dir / f"{model_name}_baseline"
    metadata = {
        "model_name": model_name,
        "model_version": config.get("pipeline", {}).get("version", "1.0.0"),
        "pipeline_name": config.get("pipeline", {}).get("name", "fall-detection-baseline"),
        "feature_names": feature_names,
        "feature_set": config.get("features", {}).get("feature_set", "geometry_temporal_quality"),
        "label_mapping": {"normal": 0, "fall": 1},
        "optimal_threshold": threshold,
        "preprocessing_config": config.get("preprocessing", {}),
        "windowing_config": config.get("windowing", {}),
        "validation_metrics": val_metrics,
    }

    saved_path = save_artifact_bundle(pipe, metadata, artifact_dir)
    print(f"\nSaved versioned artifact bundle to: {saved_path}")

    # Save training report
    reports_dir = base_dir / config.get("data", {}).get("reports_dir", "reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_file = reports_dir / "training_report.json"
    with report_file.open("w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)
    print(f"Saved training report to: {report_file}")


if __name__ == "__main__":
    main()
