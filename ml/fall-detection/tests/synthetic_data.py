"""Deterministic synthetic pose sequence generator for testing and pipeline verification."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from fall_detection.schema import (
    CURRENT_SCHEMA_VERSION,
    EXPECTED_LANDMARK_COUNT,
    ManifestEntry,
    PoseFrame,
    PoseFrameQuality,
    PoseLandmark,
    PoseSequence,
    PoseSequenceMetadata,
)


def create_base_pose_landmarks(
    head_y: float = 0.20,
    shoulder_y: float = 0.30,
    hip_y: float = 0.55,
    knee_y: float = 0.75,
    ankle_y: float = 0.92,
    center_x: float = 0.50,
    shoulder_width: float = 0.16,
    hip_width: float = 0.12,
    torso_angle_deg: float = 0.0,
    visibility: float = 0.95,
) -> List[PoseLandmark]:
    """Generate 33 MediaPipe landmarks rotated around hip midpoint."""
    landmarks: List[PoseLandmark] = []
    rad = math.radians(torso_angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    # Hip center as pivot
    pivot_x = center_x
    pivot_y = hip_y

    def rotate_point(x: float, y: float) -> tuple[float, float]:
        dx = x - pivot_x
        dy = y - pivot_y
        rx = dx * cos_a - dy * sin_a + pivot_x
        ry = dx * sin_a + dy * cos_a + pivot_y
        return rx, ry

    # Generate 33 landmarks
    for idx in range(EXPECTED_LANDMARK_COUNT):
        # Default positioning
        if idx == 0:  # nose
            rx, ry = rotate_point(center_x, head_y)
        elif 1 <= idx <= 10:  # facial landmarks
            rx, ry = rotate_point(center_x + (0.02 if idx % 2 == 0 else -0.02), head_y)
        elif idx == 11:  # left_shoulder
            rx, ry = rotate_point(center_x - shoulder_width / 2.0, shoulder_y)
        elif idx == 12:  # right_shoulder
            rx, ry = rotate_point(center_x + shoulder_width / 2.0, shoulder_y)
        elif idx == 13:  # left_elbow
            rx, ry = rotate_point(center_x - shoulder_width / 2.0 - 0.05, (shoulder_y + hip_y) / 2.0)
        elif idx == 14:  # right_elbow
            rx, ry = rotate_point(center_x + shoulder_width / 2.0 + 0.05, (shoulder_y + hip_y) / 2.0)
        elif idx == 15:  # left_wrist
            rx, ry = rotate_point(center_x - shoulder_width / 2.0 - 0.08, hip_y)
        elif idx == 16:  # right_wrist
            rx, ry = rotate_point(center_x + shoulder_width / 2.0 + 0.08, hip_y)
        elif 17 <= idx <= 22:  # hands
            rx, ry = rotate_point(center_x + (0.1 if idx % 2 == 0 else -0.1), hip_y + 0.02)
        elif idx == 23:  # left_hip
            rx, ry = center_x - hip_width / 2.0, hip_y
        elif idx == 24:  # right_hip
            rx, ry = center_x + hip_width / 2.0, hip_y
        elif idx == 25:  # left_knee
            rx, ry = center_x - hip_width / 2.0, knee_y
        elif idx == 26:  # right_knee
            rx, ry = center_x + hip_width / 2.0, knee_y
        elif idx == 27:  # left_ankle
            rx, ry = center_x - hip_width / 2.0, ankle_y
        elif idx == 28:  # right_ankle
            rx, ry = center_x + hip_width / 2.0, ankle_y
        else:  # feet (29..32)
            rx, ry = center_x + (0.06 if idx % 2 == 0 else -0.06), ankle_y + 0.03

        landmarks.append(
            PoseLandmark(
                x=round(float(rx), 4),
                y=round(float(ry), 4),
                z=0.0,
                visibility=round(float(visibility), 3),
                presence=0.99,
            )
        )

    return landmarks


def generate_synthetic_sequence(
    activity: str,  # 'standing_walk', 'sitting', 'intentional_lying', 'fall_forward', 'fall_backward'
    sequence_id: str = "seq_synth_001",
    duration_s: float = 4.0,
    fps: float = 30.0,
    subject_id: str = "subject-001",
    session_id: str = "session-001",
) -> tuple[PoseSequence, ManifestEntry]:
    """Generate a realistic synthetic PoseSequence and matching ManifestEntry."""
    total_frames = int(duration_s * fps)
    dt_ms = 1000.0 / fps
    frames: List[PoseFrame] = []

    is_fall = activity.startswith("fall_")
    event_start_ms: Optional[int] = None
    event_end_ms: Optional[int] = None

    if is_fall:
        event_start_ms = 1200
        event_end_ms = 2200

    for i in range(total_frames):
        t_ms = int(i * dt_ms)

        if activity == "standing_walk":
            # Upright standing with slight sway
            sway = 0.02 * math.sin(2.0 * math.pi * (t_ms / 1000.0))
            angle = 2.0 * math.sin(math.pi * (t_ms / 1000.0))
            lms = create_base_pose_landmarks(center_x=0.50 + sway, torso_angle_deg=angle)

        elif activity == "sitting":
            # Slow controlled transition from stand to sit
            progress = min(1.0, max(0.0, (t_ms - 1000) / 1500.0))
            hip_y = 0.55 + 0.15 * progress
            knee_y = 0.75 + 0.05 * progress
            lms = create_base_pose_landmarks(
                shoulder_y=0.30 + 0.15 * progress,
                hip_y=hip_y,
                knee_y=knee_y,
                torso_angle_deg=5.0 * progress,
            )

        elif activity == "intentional_lying":
            # Slow intentional descent
            progress = min(1.0, max(0.0, (t_ms - 800) / 2500.0))
            angle = progress * 80.0
            hip_y = 0.55 + 0.30 * progress
            lms = create_base_pose_landmarks(
                shoulder_y=0.30 + 0.50 * progress,
                hip_y=hip_y,
                knee_y=0.75 + 0.12 * progress,
                torso_angle_deg=angle,
            )

        elif activity in ("fall_forward", "fall_backward"):
            # Rapid uncontrolled rotation and descent between event_start_ms and event_end_ms
            if t_ms < event_start_ms:
                # Upright before fall
                lms = create_base_pose_landmarks(torso_angle_deg=2.0)
            elif t_ms <= event_end_ms:
                # Fast tumble
                p = (t_ms - event_start_ms) / float(event_end_ms - event_start_ms)
                # Rapid acceleration
                p_accel = p**2
                angle = p_accel * 85.0
                hip_y = 0.55 + 0.32 * p_accel
                lms = create_base_pose_landmarks(
                    shoulder_y=0.30 + 0.55 * p_accel,
                    hip_y=hip_y,
                    knee_y=0.75 + 0.13 * p_accel,
                    ankle_y=0.92,
                    torso_angle_deg=angle if activity == "fall_forward" else -angle,
                )
            else:
                # On floor, near motionless
                lms = create_base_pose_landmarks(
                    shoulder_y=0.85,
                    hip_y=0.87,
                    knee_y=0.88,
                    ankle_y=0.92,
                    torso_angle_deg=85.0 if activity == "fall_forward" else -85.0,
                )
        else:
            lms = create_base_pose_landmarks()

        q = PoseFrameQuality(
            pose_detected=True,
            valid_landmark_count=EXPECTED_LANDMARK_COUNT,
            expected_landmark_count=EXPECTED_LANDMARK_COUNT,
            mean_visibility=0.95,
        )
        frames.append(
            PoseFrame(
                timestamp_ms=t_ms,
                frame_index=i,
                landmarks=lms,
                quality=q,
            )
        )

    metadata = PoseSequenceMetadata(
        pose_sdk="@mediapipe/tasks-vision",
        pose_model_version="pose_landmarker_lite.task",
        coordinate_convention="normalized-3d-hip-relative-z",
        capture_cadence_fps=fps,
        duration_ms=duration_s * 1000.0,
        total_frames=len(frames),
        exported_at="2026-11-22T12:00:00Z",
        notes=f"Synthetic {activity} test sequence",
    )

    sequence = PoseSequence(
        schema_version=CURRENT_SCHEMA_VERSION,
        capture_id=sequence_id,
        started_at="2026-11-22T12:00:00Z",
        frames=frames,
        metadata=metadata,
    )

    manifest_entry = ManifestEntry(
        sequence_id=sequence_id,
        path=f"data/raw/{sequence_id}.json",
        schema_version=CURRENT_SCHEMA_VERSION,
        label="fall" if is_fall else "normal",
        subject_id=subject_id,
        session_id=session_id,
        source_dataset="synthetic_test_corpus",
        event_start_ms=event_start_ms,
        event_end_ms=event_end_ms,
        activity_type=activity,
        notes="Synthetic test fixture",
    )

    return sequence, manifest_entry


def create_synthetic_corpus(
    base_dir: Optional[str] = None,
) -> tuple[List[PoseSequence], List[ManifestEntry]]:
    """Create a balanced synthetic corpus across 4 distinct subjects for leakage-free splitting."""
    corpus_specs = [
        # Subject 1 (Train)
        ("standing_walk", "seq_s1_walk", "subject-001", "session-001"),
        ("sitting", "seq_s1_sit", "subject-001", "session-001"),
        ("fall_forward", "seq_s1_fall_fwd", "subject-001", "session-001"),
        # Subject 2 (Train)
        ("standing_walk", "seq_s2_walk", "subject-002", "session-002"),
        ("intentional_lying", "seq_s2_lie", "subject-002", "session-002"),
        ("fall_backward", "seq_s2_fall_bwd", "subject-002", "session-002"),
        # Subject 3 (Val)
        ("standing_walk", "seq_s3_walk", "subject-003", "session-003"),
        ("sitting", "seq_s3_sit", "subject-003", "session-003"),
        ("fall_forward", "seq_s3_fall_fwd", "subject-003", "session-003"),
        # Subject 4 (Test)
        ("standing_walk", "seq_s4_walk", "subject-004", "session-004"),
        ("intentional_lying", "seq_s4_lie", "subject-004", "session-004"),
        ("fall_forward", "seq_s4_fall_fwd", "subject-004", "session-004"),
    ]

    sequences = []
    manifest = []
    for activity, seq_id, subj, sess in corpus_specs:
        seq, entry = generate_synthetic_sequence(
            activity=activity,
            sequence_id=seq_id,
            subject_id=subj,
            session_id=sess,
        )
        sequences.append(seq)
        manifest.append(entry)

    return sequences, manifest
