"""Validation for PoseSequence data and manifests."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .schema import (
    CURRENT_SCHEMA_VERSION,
    EXPECTED_LANDMARK_COUNT,
    ManifestEntry,
    PoseSequence,
)


@dataclass
class ValidationReport:
    """Detailed result of sequence or dataset validation."""

    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "isValid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "stats": self.stats,
        }


def validate_pose_sequence(
    sequence: PoseSequence,
    expected_schema_version: str = CURRENT_SCHEMA_VERSION,
    max_acceptable_gap_ms: int = 500,
) -> ValidationReport:
    """Perform structural and semantic validation on a single PoseSequence."""
    errors: List[str] = []
    warnings: List[str] = []
    stats: Dict[str, Any] = {
        "frameCount": len(sequence.frames) if sequence.frames else 0,
        "captureId": sequence.capture_id,
        "schemaVersion": sequence.schema_version,
    }

    # 1. Schema version check
    if sequence.schema_version != expected_schema_version:
        errors.append(
            f"Unsupported schemaVersion '{sequence.schema_version}'. Expected '{expected_schema_version}'."
        )

    # 2. Capture ID check
    if not sequence.capture_id or not sequence.capture_id.strip():
        errors.append("Sequence captureId is empty or missing.")

    # 3. Frames non-empty check
    if not sequence.frames or len(sequence.frames) == 0:
        errors.append("Sequence contains 0 frames.")
        return ValidationReport(is_valid=False, errors=errors, warnings=warnings, stats=stats)

    timestamps = [f.timestamp_ms for f in sequence.frames]
    stats["startMs"] = timestamps[0]
    stats["endMs"] = timestamps[-1]
    duration_ms = timestamps[-1] - timestamps[0]
    stats["durationMs"] = duration_ms

    if duration_ms < 0:
        errors.append(f"Sequence has negative duration: {duration_ms} ms.")

    # 4. Monotonic timestamps and frame indices
    duplicate_timestamps = 0
    timestamp_reversals = 0
    large_gaps = 0
    deltas: List[int] = []

    for i in range(len(sequence.frames)):
        f = sequence.frames[i]
        curr_t = f.timestamp_ms

        # Frame index check
        if f.frame_index < 0:
            errors.append(f"Frame {i} has negative frameIndex {f.frame_index}.")

        if i > 0:
            prev_t = sequence.frames[i - 1].timestamp_ms
            delta = curr_t - prev_t
            deltas.append(delta)

            if delta == 0:
                duplicate_timestamps += 1
            elif delta < 0:
                timestamp_reversals += 1
            elif delta > max_acceptable_gap_ms:
                large_gaps += 1

        # Landmark count check
        if len(f.landmarks) != EXPECTED_LANDMARK_COUNT:
            errors.append(
                f"Frame {i} (t={curr_t}ms) has {len(f.landmarks)} landmarks; expected {EXPECTED_LANDMARK_COUNT}."
            )

        # Coordinate checks
        invalid_coords = 0
        low_vis_count = 0
        for l_idx, lm in enumerate(f.landmarks):
            if not (math.isfinite(lm.x) and math.isfinite(lm.y)):
                invalid_coords += 1
            if lm.x < -0.5 or lm.x > 1.5 or lm.y < -0.5 or lm.y > 1.5:
                warnings.append(
                    f"Frame {i} landmark {l_idx} coordinate out of standard bounds: x={lm.x}, y={lm.y}"
                )
            if lm.visibility is not None and lm.visibility < 0.3:
                low_vis_count += 1

        if invalid_coords > 0:
            errors.append(f"Frame {i} has {invalid_coords} non-finite coordinates.")

        # Quality consistency check
        if f.quality.valid_landmark_count > EXPECTED_LANDMARK_COUNT:
            errors.append(
                f"Frame {i} quality validLandmarkCount ({f.quality.valid_landmark_count}) exceeds expected {EXPECTED_LANDMARK_COUNT}."
            )

    if duplicate_timestamps > 0:
        warnings.append(f"Found {duplicate_timestamps} consecutive frames with duplicate timestamps.")
    if timestamp_reversals > 0:
        errors.append(f"Found {timestamp_reversals} timestamp order reversals (non-monotonic timestamps).")
    if large_gaps > 0:
        warnings.append(
            f"Found {large_gaps} temporal gaps exceeding {max_acceptable_gap_ms} ms."
        )

    # Cadence stats
    if deltas:
        avg_delta = sum(deltas) / len(deltas)
        stats["meanDeltaMs"] = round(avg_delta, 2)
        stats["estimatedFps"] = round(1000.0 / avg_delta, 2) if avg_delta > 0 else 0.0
        stats["maxDeltaMs"] = max(deltas)
        stats["minDeltaMs"] = min(deltas)

    is_valid = len(errors) == 0
    return ValidationReport(is_valid=is_valid, errors=errors, warnings=warnings, stats=stats)


def validate_manifest_entry(
    entry: ManifestEntry,
    base_dir: Optional[Union[str, Path]] = None,
) -> ValidationReport:
    """Validate a single manifest record."""
    errors: List[str] = []
    warnings: List[str] = []
    stats: Dict[str, Any] = {"sequence_id": entry.sequence_id, "label": entry.label}

    if entry.label not in ("fall", "normal"):
        errors.append(f"Invalid label '{entry.label}'. Must be 'fall' or 'normal'.")

    if not entry.subject_id or not entry.subject_id.strip():
        warnings.append("Manifest entry subject_id is empty; grouping will rely on session/sequence.")

    if not entry.session_id or not entry.session_id.strip():
        warnings.append("Manifest entry session_id is empty.")

    if entry.label == "fall":
        if entry.event_start_ms is None or entry.event_end_ms is None:
            warnings.append(
                f"Fall sequence '{entry.sequence_id}' lacks annotated event_start_ms / event_end_ms."
            )
        elif entry.event_start_ms > entry.event_end_ms:
            errors.append(
                f"event_start_ms ({entry.event_start_ms}) > event_end_ms ({entry.event_end_ms})."
            )

    # File existence check
    base_path = Path(base_dir) if base_dir else Path.cwd()
    target_path = Path(entry.path)
    if not target_path.is_absolute():
        target_path = base_path / target_path
    if not target_path.is_file():
        errors.append(f"Referenced sequence file does not exist: {target_path}")

    return ValidationReport(
        is_valid=(len(errors) == 0), errors=errors, warnings=warnings, stats=stats
    )


def validate_dataset(
    manifest_entries: List[ManifestEntry],
    base_dir: Optional[Union[str, Path]] = None,
    max_acceptable_gap_ms: int = 500,
) -> Dict[str, Any]:
    """Validate full dataset: manifest records, file existence, and sequence content."""
    total_sequences = len(manifest_entries)
    valid_count = 0
    invalid_count = 0
    results: List[Dict[str, Any]] = []
    subject_counts: Dict[str, int] = {}
    class_counts: Dict[str, int] = {"fall": 0, "normal": 0}

    for entry in manifest_entries:
        entry_report = validate_manifest_entry(entry, base_dir=base_dir)
        class_counts[entry.label] = class_counts.get(entry.label, 0) + 1
        subject_counts[entry.subject_id] = subject_counts.get(entry.subject_id, 0) + 1

        seq_report: Optional[ValidationReport] = None
        if entry_report.is_valid:
            base_path = Path(base_dir) if base_dir else Path.cwd()
            target_path = Path(entry.path)
            if not target_path.is_absolute():
                target_path = base_path / target_path
            try:
                from .ingest import load_sequence_from_file

                seq = load_sequence_from_file(target_path)
                seq_report = validate_pose_sequence(
                    seq, max_acceptable_gap_ms=max_acceptable_gap_ms
                )
            except Exception as e:
                entry_report.is_valid = False
                entry_report.errors.append(f"Failed to read/parse sequence: {str(e)}")

        combined_errors = entry_report.errors + (seq_report.errors if seq_report else [])
        combined_warnings = entry_report.warnings + (seq_report.warnings if seq_report else [])
        seq_valid = (len(combined_errors) == 0)

        if seq_valid:
            valid_count += 1
        else:
            invalid_count += 1

        results.append(
            {
                "sequence_id": entry.sequence_id,
                "path": entry.path,
                "label": entry.label,
                "subject_id": entry.subject_id,
                "session_id": entry.session_id,
                "is_valid": seq_valid,
                "errors": combined_errors,
                "warnings": combined_warnings,
                "stats": seq_report.stats if seq_report else {},
            }
        )

    return {
        "total_sequences": total_sequences,
        "valid_sequences": valid_count,
        "invalid_sequences": invalid_count,
        "unique_subjects": len(subject_counts),
        "class_distribution": class_counts,
        "subject_distribution": subject_counts,
        "details": results,
    }
