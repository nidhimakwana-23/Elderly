"""Sliding window generation with label assignment rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import numpy as np

from .preprocessing import PreprocessedSequence
from .schema import ManifestEntry


@dataclass
class WindowData:
    """A temporal window extracted from a preprocessed sequence."""

    window_id: str
    sequence_id: str
    subject_id: str
    session_id: str
    start_ms: int
    end_ms: int
    timestamps_ms: np.ndarray  # shape: (W,)
    coords_norm: np.ndarray  # shape: (W, 33, 3)
    coords_raw: np.ndarray  # shape: (W, 33, 3)
    validity_mask: np.ndarray  # shape: (W, 33)
    visibility: np.ndarray  # shape: (W, 33)
    hip_global_y: np.ndarray  # shape: (W,)
    label: str  # 'fall', 'normal', 'ambiguous'
    quality_score: float  # [0.0, 1.0] fraction of valid landmarks


def assign_window_label(
    window_start_ms: int,
    window_end_ms: int,
    manifest_entry: ManifestEntry,
    fall_event_min_overlap_ms: int = 500,
    ambiguous_margin_ms: int = 200,
) -> str:
    """Determine the label of a temporal window based on manifest event bounds.

    Rules:
    - Normal sequence -> 'normal'
    - Fall sequence with bounds:
      - Overlap >= fall_event_min_overlap_ms -> 'fall'
      - Completely outside [event_start - margin, event_end + margin] -> 'normal'
      - Otherwise -> 'ambiguous' (transition zone; excluded from training)
    - Fall sequence without bounds -> 'fall'
    """
    if manifest_entry.label == "normal":
        return "normal"

    # Fall sequence
    if manifest_entry.event_start_ms is None or manifest_entry.event_end_ms is None:
        return "fall"

    ev_start = manifest_entry.event_start_ms
    ev_end = manifest_entry.event_end_ms

    overlap = max(0, min(window_end_ms, ev_end) - max(window_start_ms, ev_start))
    if overlap >= fall_event_min_overlap_ms:
        return "fall"

    # Check if completely outside event + margin
    outside_before = window_end_ms <= (ev_start - ambiguous_margin_ms)
    outside_after = window_start_ms >= (ev_end + ambiguous_margin_ms)

    if outside_before or outside_after:
        return "normal"

    return "ambiguous"


def generate_windows_for_sequence(
    preprocessed: PreprocessedSequence,
    manifest_entry: ManifestEntry,
    window_duration_s: float = 2.5,
    window_stride_s: float = 0.5,
    min_frames_per_window: int = 25,
    fall_event_min_overlap_ms: int = 500,
    ambiguous_margin_ms: int = 200,
    min_valid_landmarks_ratio: float = 0.5,
) -> List[WindowData]:
    """Generate fixed-duration sliding windows from a preprocessed sequence."""
    timestamps = preprocessed.timestamps_ms
    if len(timestamps) < min_frames_per_window:
        return []

    window_duration_ms = int(window_duration_s * 1000)
    stride_ms = int(window_stride_s * 1000)

    seq_start_ms = int(timestamps[0])
    seq_end_ms = int(timestamps[-1])

    windows: List[WindowData] = []
    w_idx = 0

    cur_start_ms = seq_start_ms
    while cur_start_ms + window_duration_ms <= seq_end_ms:
        cur_end_ms = cur_start_ms + window_duration_ms

        # Slice indices
        mask = (timestamps >= cur_start_ms) & (timestamps <= cur_end_ms)
        indices = np.where(mask)[0]

        if len(indices) >= min_frames_per_window:
            w_ts = timestamps[indices]
            w_norm = preprocessed.coords_norm[indices]
            w_raw = preprocessed.coords_raw[indices]
            w_val = preprocessed.validity_mask[indices]
            w_vis = preprocessed.visibility[indices]
            w_hip_y = preprocessed.hip_global_y[indices]

            # Quality check
            total_elements = w_val.size
            valid_elements = int(np.sum(w_val))
            quality_score = float(valid_elements / total_elements) if total_elements > 0 else 0.0

            if quality_score >= min_valid_landmarks_ratio:
                lbl = assign_window_label(
                    cur_start_ms,
                    cur_end_ms,
                    manifest_entry,
                    fall_event_min_overlap_ms=fall_event_min_overlap_ms,
                    ambiguous_margin_ms=ambiguous_margin_ms,
                )

                window_id = f"{manifest_entry.sequence_id}_w{w_idx:03d}_{cur_start_ms}_{cur_end_ms}"
                windows.append(
                    WindowData(
                        window_id=window_id,
                        sequence_id=manifest_entry.sequence_id,
                        subject_id=manifest_entry.subject_id,
                        session_id=manifest_entry.session_id,
                        start_ms=cur_start_ms,
                        end_ms=cur_end_ms,
                        timestamps_ms=w_ts,
                        coords_norm=w_norm,
                        coords_raw=w_raw,
                        validity_mask=w_val,
                        visibility=w_vis,
                        hip_global_y=w_hip_y,
                        label=lbl,
                        quality_score=round(quality_score, 4),
                    )
                )
                w_idx += 1

        cur_start_ms += stride_ms

    return windows
