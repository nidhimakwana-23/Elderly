"""Group-aware dataset splitting with strict leakage prevention."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import numpy as np


class DataLeakageError(Exception):
    """Raised when subjects or sequences are leaked across train/val/test splits."""

    pass


def assert_no_leakage(
    train_meta: List[Dict[str, Any]],
    val_meta: List[Dict[str, Any]],
    test_meta: List[Dict[str, Any]],
    group_by: str = "subject_id",
) -> None:
    """Strictly assert that no sequence or group is shared across splits."""
    train_seqs: Set[str] = {m["sequence_id"] for m in train_meta}
    val_seqs: Set[str] = {m["sequence_id"] for m in val_meta}
    test_seqs: Set[str] = {m["sequence_id"] for m in test_meta}

    # Sequence leakage checks
    train_val_seq_leak = train_seqs.intersection(val_seqs)
    if train_val_seq_leak:
        raise DataLeakageError(
            f"Sequence leakage detected between train and val: {train_val_seq_leak}"
        )

    train_test_seq_leak = train_seqs.intersection(test_seqs)
    if train_test_seq_leak:
        raise DataLeakageError(
            f"Sequence leakage detected between train and test: {train_test_seq_leak}"
        )

    val_test_seq_leak = val_seqs.intersection(test_seqs)
    if val_test_seq_leak:
        raise DataLeakageError(
            f"Sequence leakage detected between val and test: {val_test_seq_leak}"
        )

    # Group leakage checks (e.g. subject_id)
    if group_by in ("subject_id", "session_id"):
        train_groups: Set[str] = {m[group_by] for m in train_meta if m.get(group_by)}
        val_groups: Set[str] = {m[group_by] for m in val_meta if m.get(group_by)}
        test_groups: Set[str] = {m[group_by] for m in test_meta if m.get(group_by)}

        tv_leak = train_groups.intersection(val_groups)
        if tv_leak:
            raise DataLeakageError(f"{group_by} leakage between train and val: {tv_leak}")

        tt_leak = train_groups.intersection(test_groups)
        if tt_leak:
            raise DataLeakageError(f"{group_by} leakage between train and test: {tt_leak}")

        vt_leak = val_groups.intersection(test_groups)
        if vt_leak:
            raise DataLeakageError(f"{group_by} leakage between val and test: {vt_leak}")


def create_grouped_splits(
    window_meta: List[Dict[str, Any]],
    group_by: str = "subject_id",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_seed: int = 42,
) -> Tuple[List[int], List[int], List[int], Dict[str, Any]]:
    """Partition windows into train, val, and test splits without group leakage.

    Returns:
        train_indices: list of window indices
        val_indices: list of window indices
        test_indices: list of window indices
        split_manifest: dict with split metadata
    """
    if not window_meta:
        return [], [], [], {}

    # Check unique groups
    groups = list({m[group_by] for m in window_meta if m.get(group_by)})
    if len(groups) < 3:
        # Fallback to session_id or sequence_id if fewer than 3 groups
        fallback_group = "session_id" if group_by == "subject_id" else "sequence_id"
        alt_groups = list({m[fallback_group] for m in window_meta if m.get(fallback_group)})
        if len(alt_groups) >= 3:
            group_by = fallback_group
            groups = alt_groups

    # Map groups to windows and labels
    group_to_windows = defaultdict(list)
    group_to_labels = defaultdict(set)
    for idx, m in enumerate(window_meta):
        g = m.get(group_by, m["sequence_id"])
        group_to_windows[g].append(idx)
        group_to_labels[g].add(m["label"])

    rng = np.random.default_rng(random_seed)
    sorted_groups = sorted(group_to_windows.keys())
    rng.shuffle(sorted_groups)

    # Separate groups into those containing positive falls and pure normals
    fall_groups = [g for g in sorted_groups if "fall" in group_to_labels[g]]
    normal_groups = [g for g in sorted_groups if "fall" not in group_to_labels[g]]

    def distribute_groups(
        grp_list: List[str],
    ) -> Tuple[List[str], List[str], List[str]]:
        n = len(grp_list)
        if n == 0:
            return [], [], []
        if n == 1:
            return [grp_list[0]], [], []
        if n == 2:
            return [grp_list[0]], [grp_list[1]], []

        n_train = max(1, int(round(n * train_ratio)))
        n_val = max(1, int(round(n * val_ratio)))
        if n_train + n_val >= n:
            n_train = max(1, n - 2)
            n_val = 1
        n_test = n - (n_train + n_val)
        if n_test <= 0 and n >= 3:
            n_test = 1
            if n_train > 1:
                n_train -= 1
            else:
                n_val -= 1

        tr = grp_list[:n_train]
        va = grp_list[n_train : n_train + n_val]
        te = grp_list[n_train + n_val :]
        return tr, va, te

    tr_fall, va_fall, te_fall = distribute_groups(fall_groups)
    tr_norm, va_norm, te_norm = distribute_groups(normal_groups)

    train_groups = set(tr_fall + tr_norm)
    val_groups = set(va_fall + va_norm)
    test_groups = set(te_fall + te_norm)

    train_indices: List[int] = []
    val_indices: List[int] = []
    test_indices: List[int] = []

    for g in train_groups:
        train_indices.extend(group_to_windows[g])
    for g in val_groups:
        val_indices.extend(group_to_windows[g])
    for g in test_groups:
        test_indices.extend(group_to_windows[g])

    # Sort indices
    train_indices.sort()
    val_indices.sort()
    test_indices.sort()

    # Leakage check
    train_meta = [window_meta[i] for i in train_indices]
    val_meta = [window_meta[i] for i in val_indices]
    test_meta = [window_meta[i] for i in test_indices]

    assert_no_leakage(train_meta, val_meta, test_meta, group_by=group_by)

    split_manifest = {
        "group_by": group_by,
        "random_seed": random_seed,
        "train_groups": sorted(list(train_groups)),
        "val_groups": sorted(list(val_groups)),
        "test_groups": sorted(list(test_groups)),
        "train_window_count": len(train_indices),
        "val_window_count": len(val_indices),
        "test_window_count": len(test_indices),
    }

    return train_indices, val_indices, test_indices, split_manifest


def save_split_manifest(split_manifest: Dict[str, Any], path: Union[str, Path]) -> None:
    """Save split assignments to JSON."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        json.dump(split_manifest, f, indent=2)
