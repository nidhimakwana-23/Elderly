"""End-to-end pipeline integration test using synthetic corpus."""

import json
from pathlib import Path

import numpy as np
from fall_detection.artifacts import save_artifact_bundle
from fall_detection.evaluation import compute_metrics
from fall_detection.features import windows_to_feature_matrix
from fall_detection.inference import FallClassifier
from fall_detection.ingest import save_manifest
from fall_detection.preprocessing import preprocess_sequence
from fall_detection.splits import create_grouped_splits
from fall_detection.training import train_and_compare_baselines
from fall_detection.validation import validate_dataset
from fall_detection.windowing import generate_windows_for_sequence


def test_full_pipeline_end_to_end(tmp_path, synthetic_corpus):
    sequences, manifest_entries = synthetic_corpus

    # 1. Setup raw data files and manifest in tmp_path
    raw_dir = tmp_path / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    for seq, entry in zip(sequences, manifest_entries):
        seq_file = raw_dir / f"{seq.capture_id}.json"
        with seq_file.open("w", encoding="utf-8") as f:
            json.dump(seq.to_dict(), f)
        # Update manifest path relative to base_dir (tmp_path)
        entry.path = f"data/raw/{seq.capture_id}.json"

    manifest_file = tmp_path / "manifests" / "dataset_manifest.json"
    save_manifest(manifest_entries, manifest_file)

    # 2. Ingestion & Validation
    validation_report = validate_dataset(manifest_entries, base_dir=tmp_path)
    assert validation_report["invalid_sequences"] == 0
    assert validation_report["valid_sequences"] == len(sequences)
    assert validation_report["unique_subjects"] == 4

    # 3. Preprocessing and Windowing
    all_windows = []
    for seq, entry in zip(sequences, manifest_entries):
        preprocessed = preprocess_sequence(seq, target_cadence_hz=20.0)
        windows = generate_windows_for_sequence(
            preprocessed,
            entry,
            window_duration_s=2.5,
            window_stride_s=0.5,
            min_frames_per_window=20,
        )
        all_windows.extend(windows)

    assert len(all_windows) > 0

    # 4. Feature Extraction
    X, y, feature_names, meta = windows_to_feature_matrix(all_windows)
    assert len(X) == len(y)
    assert len(feature_names) > 0

    # 5. Grouped Splitting (Subject-independent)
    train_idx, val_idx, test_idx, split_manifest = create_grouped_splits(
        meta, group_by="subject_id", random_seed=42
    )

    assert len(train_idx) > 0
    assert len(val_idx) > 0
    assert len(test_idx) > 0

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # Verify no subject leakage
    train_subjs = {meta[i]["subject_id"] for i in train_idx}
    val_subjs = {meta[i]["subject_id"] for i in val_idx}
    test_subjs = {meta[i]["subject_id"] for i in test_idx}
    assert len(train_subjs.intersection(val_subjs)) == 0
    assert len(train_subjs.intersection(test_subjs)) == 0
    assert len(val_subjs.intersection(test_subjs)) == 0

    # 6. Baseline Training & Model Selection
    pipe, model_name, threshold, comparison = train_and_compare_baselines(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        feature_names=feature_names,
        threshold_metric="f1",
    )

    # 7. Save Artifact Bundle
    artifact_dir = tmp_path / "models" / f"{model_name}_baseline"
    metadata = {
        "model_name": model_name,
        "model_version": "1.0.0",
        "feature_names": feature_names,
        "optimal_threshold": threshold,
        "preprocessing_config": {"target_cadence_hz": 20.0},
        "windowing_config": {"min_frames_per_window": 20},
    }
    save_artifact_bundle(pipe, metadata, artifact_dir)

    # 8. Evaluation on Held-out Test Split
    test_probs = pipe.predict_proba(X_test)[:, 1]
    test_metrics = compute_metrics(y_test, test_probs, threshold=threshold)
    assert test_metrics.total_samples == len(y_test)

    # 9. Fresh-process Inference Test
    classifier = FallClassifier.load(artifact_dir)

    # Test inference on a valid raw frame slice
    test_seq = sequences[0]
    result = classifier.predict(test_seq.frames[:30])

    assert result["is_valid"] is True
    assert result["label"] in ("fall", "normal")
    assert 0.0 <= result["fall_score"] <= 1.0
    assert result["model_version"] == "1.0.0"
