"""Artifact bundling, versioning, serialization, and deserialization."""

from __future__ import annotations

import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import sklearn
from sklearn.pipeline import Pipeline


def save_artifact_bundle(
    pipeline: Pipeline,
    metadata: Dict[str, Any],
    output_dir: Union[str, Path],
) -> Path:
    """Save pipeline binary and metadata JSON into an artifact bundle directory."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    model_file = out_path / "model.joblib"
    meta_file = out_path / "metadata.json"

    # Inject runtime dependency versions and timestamp
    enriched_metadata = {
        **metadata,
        "saved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dependency_versions": {
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
            "joblib": joblib.__version__,
        },
    }

    # Save joblib binary
    joblib.dump(pipeline, model_file)

    # Save JSON metadata
    with meta_file.open("w", encoding="utf-8") as f:
        json.dump(enriched_metadata, f, indent=2)

    return out_path


def load_artifact_bundle(
    artifact_dir_or_path: Union[str, Path],
) -> Tuple[Pipeline, Dict[str, Any]]:
    """Load model pipeline and metadata from an artifact bundle."""
    path = Path(artifact_dir_or_path)

    if path.is_file():
        # Passed direct path to model.joblib or metadata.json
        if path.name == "metadata.json":
            meta_file = path
            model_file = path.parent / "model.joblib"
        else:
            model_file = path
            meta_file = path.parent / "metadata.json"
    else:
        model_file = path / "model.joblib"
        meta_file = path / "metadata.json"

    if not model_file.is_file():
        raise FileNotFoundError(f"Model file not found: {model_file}")
    if not meta_file.is_file():
        raise FileNotFoundError(f"Metadata file not found: {meta_file}")

    with meta_file.open("r", encoding="utf-8") as f:
        metadata = json.load(f)

    pipeline = joblib.load(model_file)

    return pipeline, metadata
