"""Dataset and sequence ingestion for fall-detection."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple, Union

from .schema import CURRENT_SCHEMA_VERSION, ManifestEntry, PoseSequence


def load_sequence_from_dict(data: Dict[str, Any]) -> PoseSequence:
    """Instantiate a PoseSequence from a dictionary."""
    return PoseSequence.from_dict(data)


def load_sequence_from_json(json_str: str) -> PoseSequence:
    """Parse a PoseSequence from a JSON string."""
    data = json.loads(json_str)
    return load_sequence_from_dict(data)


def load_sequence_from_file(file_path: Union[str, Path]) -> PoseSequence:
    """Load and parse a PoseSequence from a JSON file on disk."""
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Sequence file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return load_sequence_from_dict(data)


def load_manifest(manifest_path: Union[str, Path]) -> List[ManifestEntry]:
    """Load a dataset manifest JSON file containing sequence entries."""
    path = Path(manifest_path)
    if not path.is_file():
        raise FileNotFoundError(f"Manifest file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    entries_data = data.get("sequences", data) if isinstance(data, dict) else data
    if not isinstance(entries_data, list):
        raise ValueError(
            f"Invalid manifest structure at {path}. Expected list or dict with 'sequences' list."
        )

    return [ManifestEntry.from_dict(item) for item in entries_data]


def save_manifest(
    entries: List[ManifestEntry],
    out_path: Union[str, Path],
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Save manifest entries and optional dataset metadata to disk."""
    path = Path(out_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "metadata": metadata or {},
        "sequences": [e.to_dict() for e in entries],
    }
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def iter_manifest_sequences(
    manifest_entries: List[ManifestEntry],
    base_dir: Optional[Union[str, Path]] = None,
) -> Generator[Tuple[ManifestEntry, PoseSequence], None, None]:
    """Iterate through manifest entries and yield (ManifestEntry, PoseSequence) pairs."""
    base_path = Path(base_dir) if base_dir else Path.cwd()
    for entry in manifest_entries:
        seq_path = Path(entry.path)
        if not seq_path.is_absolute():
            seq_path = base_path / seq_path
        sequence = load_sequence_from_file(seq_path)
        yield entry, sequence
