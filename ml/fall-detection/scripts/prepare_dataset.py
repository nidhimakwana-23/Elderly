#!/usr/bin/env python3
"""Dataset preparation script: preprocessing, windowing, and grouped splitting."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml

# Allow importing src/fall_detection
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fall_detection.features import windows_to_feature_matrix
from fall_detection.ingest import iter_manifest_sequences, load_manifest
from fall_detection.preprocessing import preprocess_sequence
from fall_detection.splits import create_grouped_splits, save_split_manifest
from fall_detection.windowing import generate_windows_for_sequence


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess sequences and generate temporal windows.")
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
    manifest_rel = config.get("data", {}).get("manifest_path", "manifests/dataset_manifest.json")
    manifest_path = base_dir / manifest_rel

    if not manifest_path.is_file():
        print(f"Error: Manifest file not found at {manifest_path}", file=sys.stderr)
        sys.exit(1)

    prep_cfg = config.get("preprocessing", {})
    win_cfg = config.get("windowing", {})
    feat_cfg = config.get("features", {})
    split_cfg = config.get("splitting", {})

    print(f"Loading manifest from: {manifest_path}")
    manifest_entries = load_manifest(manifest_path)

    all_windows = []
    processed_sequences = 0

    print("Preprocessing sequences and generating temporal windows...")
    for entry, seq in iter_manifest_sequences(manifest_entries, base_dir=base_dir):
        preprocessed = preprocess_sequence(
            seq,
            target_cadence_hz=prep_cfg.get("target_cadence_hz", 20.0),
            max_gap_interpolation_ms=prep_cfg.get("max_gap_interpolation_ms", 350),
            min_landmark_visibility=prep_cfg.get("min_landmark_visibility", 0.3),
        )

        windows = generate_windows_for_sequence(
            preprocessed,
            entry,
            window_duration_s=win_cfg.get("window_duration_s", 2.5),
            window_stride_s=win_cfg.get("window_stride_s", 0.5),
            min_frames_per_window=win_cfg.get("min_frames_per_window", 25),
            fall_event_min_overlap_ms=win_cfg.get("fall_event_min_overlap_ms", 500),
            ambiguous_margin_ms=win_cfg.get("ambiguous_margin_ms", 200),
        )
        all_windows.extend(windows)
        processed_sequences += 1

    print(f"Processed {processed_sequences} sequences. Generated {len(all_windows)} total windows.")

    # Extract features
    feature_set = feat_cfg.get("feature_set", "geometry_temporal_quality")
    smoothing_window = feat_cfg.get("smoothing_window_size", 3)
    X, y, feature_names, meta = windows_to_feature_matrix(
        all_windows, feature_set=feature_set, smoothing_window=smoothing_window
    )
    print(f"Feature matrix shape: {X.shape}. Class distribution: {np.bincount(y)}")

    # Grouped train/val/test splitting
    group_by = split_cfg.get("strategy", "grouped_by_subject").replace("grouped_by_", "")
    train_idx, val_idx, test_idx, split_manifest = create_grouped_splits(
        meta,
        group_by=group_by,
        train_ratio=split_cfg.get("train_ratio", 0.70),
        val_ratio=split_cfg.get("val_ratio", 0.15),
        test_ratio=split_cfg.get("test_ratio", 0.15),
        random_seed=split_cfg.get("random_seed", 42),
    )

    print(
        f"Splits generated: train={len(train_idx)} windows, val={len(val_idx)} windows, test={len(test_idx)} windows"
    )

    # Save split manifest
    manifests_dir = base_dir / "manifests"
    manifests_dir.mkdir(parents=True, exist_ok=True)
    split_manifest_path = manifests_dir / "split_manifest.json"
    save_split_manifest(split_manifest, split_manifest_path)
    print(f"Saved split manifest to: {split_manifest_path}")

    # Save processed dataset
    processed_dir = base_dir / config.get("data", {}).get("processed_dir", "data/processed")
    processed_dir.mkdir(parents=True, exist_ok=True)
    npz_path = processed_dir / "dataset.npz"

    np.savez_compressed(
        npz_path,
        X_train=X[train_idx],
        y_train=y[train_idx],
        X_val=X[val_idx],
        y_val=y[val_idx],
        X_test=X[test_idx],
        y_test=y[test_idx],
        feature_names=feature_names,
    )
    print(f"Saved processed dataset NPZ to: {npz_path}")

    # Save metadata JSON
    meta_path = processed_dir / "windows_metadata.json"
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "train_windows": [meta[i] for i in train_idx],
                "val_windows": [meta[i] for i in val_idx],
                "test_windows": [meta[i] for i in test_idx],
            },
            f,
            indent=2,
        )

    # Save summary report
    reports_dir = base_dir / config.get("data", {}).get("reports_dir", "reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_file = reports_dir / "data_preparation_report.json"
    with report_file.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "total_sequences": processed_sequences,
                "total_windows": len(meta),
                "feature_count": len(feature_names),
                "features": feature_names,
                "split_summary": split_manifest,
            },
            f,
            indent=2,
        )
    print(f"Data preparation report saved to: {report_file}")


if __name__ == "__main__":
    main()
