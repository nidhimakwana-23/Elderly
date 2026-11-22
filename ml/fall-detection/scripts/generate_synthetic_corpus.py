#!/usr/bin/env python3
"""Generate a synthetic sequence corpus and manifest for development and smoke-testing."""

import json
import sys
from pathlib import Path

# Allow importing src and tests
base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir / "src"))
sys.path.insert(0, str(base_dir / "tests"))

from fall_detection.ingest import save_manifest
from synthetic_data import create_synthetic_corpus


def main() -> None:
    raw_dir = base_dir / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    manifest_file = base_dir / "manifests" / "dataset_manifest.json"

    print("Generating synthetic sequences across 4 subjects...")
    sequences, manifest_entries = create_synthetic_corpus(base_dir=str(base_dir))

    for seq, entry in zip(sequences, manifest_entries):
        seq_path = raw_dir / f"{seq.capture_id}.json"
        with seq_path.open("w", encoding="utf-8") as f:
            json.dump(seq.to_dict(), f, indent=2)
        # Store relative path in manifest
        entry.path = f"data/raw/{seq.capture_id}.json"

    metadata = {
        "description": "Synthetic multi-subject pose sequence corpus for test and development.",
        "note": "Synthetic test data only. Not clinical or real human fall recordings.",
    }
    save_manifest(manifest_entries, manifest_file, metadata=metadata)
    print(f"Generated {len(sequences)} synthetic sequences in {raw_dir}")
    print(f"Saved manifest to: {manifest_file}")


if __name__ == "__main__":
    main()
