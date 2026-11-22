#!/usr/bin/env python3
"""Dataset validation script for fall detection."""

import argparse
import json
import sys
from pathlib import Path

import yaml

# Allow importing src/fall_detection
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fall_detection.ingest import load_manifest
from fall_detection.validation import validate_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate fall-detection dataset.")
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
        print("Tip: If you are setting up the module, prepare your manifest or run tests with synthetic fixtures.", file=sys.stderr)
        sys.exit(1)

    print(f"Validating manifest: {manifest_path}")
    manifest_entries = load_manifest(manifest_path)
    report = validate_dataset(manifest_entries, base_dir=base_dir)

    print(f"Total sequences checked: {report['total_sequences']}")
    print(f"Valid sequences:        {report['valid_sequences']}")
    print(f"Invalid sequences:      {report['invalid_sequences']}")
    print(f"Unique subjects:        {report['unique_subjects']}")
    print(f"Class distribution:     {report['class_distribution']}")

    reports_dir = base_dir / config.get("data", {}).get("reports_dir", "reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    out_file = reports_dir / "dataset_validation_report.json"
    with out_file.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Validation report saved to: {out_file}")

    if report["invalid_sequences"] > 0:
        print("Validation finished with errors in one or more sequences.", file=sys.stderr)
        sys.exit(1)
    else:
        print("Validation successful: All sequences conformed to specification.")


if __name__ == "__main__":
    main()
