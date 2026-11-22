"""Data contracts and schemas for Elderly Fall Detection.

Mirrors the application-owned contracts defined in Milestone B:
fe/src/features/fall-detection/types/pose-sequence.types.ts
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

CURRENT_SCHEMA_VERSION = "1.0.0"
EXPECTED_LANDMARK_COUNT = 33

MEDIAPIPE_LANDMARK_NAMES = [
    "nose",  # 0
    "left_eye_inner",  # 1
    "left_eye",  # 2
    "left_eye_outer",  # 3
    "right_eye_inner",  # 4
    "right_eye",  # 5
    "right_eye_outer",  # 6
    "left_ear",  # 7
    "right_ear",  # 8
    "mouth_left",  # 9
    "mouth_right",  # 10
    "left_shoulder",  # 11
    "right_shoulder",  # 12
    "left_elbow",  # 13
    "right_elbow",  # 14
    "left_wrist",  # 15
    "right_wrist",  # 16
    "left_pinky",  # 17
    "right_pinky",  # 18
    "left_index",  # 19
    "right_index",  # 20
    "left_thumb",  # 21
    "right_thumb",  # 22
    "left_hip",  # 23
    "right_hip",  # 24
    "left_knee",  # 25
    "right_knee",  # 26
    "left_ankle",  # 27
    "right_ankle",  # 28
    "left_heel",  # 29
    "right_heel",  # 30
    "left_foot_index",  # 31
    "right_foot_index",  # 32
]

LANDMARK_INDEX_BY_NAME = {name: idx for idx, name in enumerate(MEDIAPIPE_LANDMARK_NAMES)}


@dataclass
class PoseLandmark:
    """Normalized 3D body landmark."""

    x: float
    y: float
    z: Optional[float] = None
    visibility: Optional[float] = None
    presence: Optional[float] = None

    def is_valid(self, min_visibility: float = 0.0) -> bool:
        """Check whether coordinates are finite and visibility meets minimum threshold."""
        if not (math.isfinite(self.x) and math.isfinite(self.y)):
            return False
        if self.z is not None and not math.isfinite(self.z):
            return False
        if self.visibility is not None:
            if not math.isfinite(self.visibility) or self.visibility < min_visibility:
                return False
        if self.presence is not None:
            if not math.isfinite(self.presence) or self.presence < 0.0:
                return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {"x": self.x, "y": self.y}
        if self.z is not None:
            res["z"] = self.z
        if self.visibility is not None:
            res["visibility"] = self.visibility
        if self.presence is not None:
            res["presence"] = self.presence
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PoseLandmark:
        return cls(
            x=float(data.get("x", 0.0)),
            y=float(data.get("y", 0.0)),
            z=float(data["z"]) if "z" in data and data["z"] is not None else None,
            visibility=(
                float(data["visibility"])
                if "visibility" in data and data["visibility"] is not None
                else None
            ),
            presence=(
                float(data["presence"])
                if "presence" in data and data["presence"] is not None
                else None
            ),
        )


@dataclass
class PoseFrameQuality:
    """Frame quality indicators."""

    pose_detected: bool
    valid_landmark_count: int
    expected_landmark_count: int = EXPECTED_LANDMARK_COUNT
    mean_visibility: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "poseDetected": self.pose_detected,
            "validLandmarkCount": self.valid_landmark_count,
            "expectedLandmarkCount": self.expected_landmark_count,
        }
        if self.mean_visibility is not None:
            res["meanVisibility"] = self.mean_visibility
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PoseFrameQuality:
        return cls(
            pose_detected=bool(data.get("poseDetected", False)),
            valid_landmark_count=int(data.get("validLandmarkCount", 0)),
            expected_landmark_count=int(
                data.get("expectedLandmarkCount", EXPECTED_LANDMARK_COUNT)
            ),
            mean_visibility=(
                float(data["meanVisibility"])
                if "meanVisibility" in data and data["meanVisibility"] is not None
                else None
            ),
        )


@dataclass
class PoseFrame:
    """Structured single-frame pose capture."""

    timestamp_ms: int
    frame_index: int
    landmarks: List[PoseLandmark]
    quality: PoseFrameQuality

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestampMs": self.timestamp_ms,
            "frameIndex": self.frame_index,
            "landmarks": [lm.to_dict() for lm in self.landmarks],
            "quality": self.quality.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PoseFrame:
        raw_landmarks = data.get("landmarks", [])
        landmarks = [PoseLandmark.from_dict(lm) for lm in raw_landmarks]
        raw_quality = data.get("quality", {})
        quality = PoseFrameQuality.from_dict(raw_quality)
        return cls(
            timestamp_ms=int(data.get("timestampMs", 0)),
            frame_index=int(data.get("frameIndex", 0)),
            landmarks=landmarks,
            quality=quality,
        )


@dataclass
class PoseSequenceMetadata:
    """Metadata recorded for a sequence capture or export."""

    pose_sdk: str = "@mediapipe/tasks-vision"
    coordinate_convention: str = "normalized-3d-hip-relative-z"
    pose_model_version: Optional[str] = "pose_landmarker_lite.task"
    capture_cadence_fps: Optional[float] = None
    duration_ms: Optional[float] = None
    total_frames: Optional[int] = None
    exported_at: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "poseSdk": self.pose_sdk,
            "coordinateConvention": self.coordinate_convention,
        }
        if self.pose_model_version is not None:
            res["poseModelVersion"] = self.pose_model_version
        if self.capture_cadence_fps is not None:
            res["captureCadenceFps"] = self.capture_cadence_fps
        if self.duration_ms is not None:
            res["durationMs"] = self.duration_ms
        if self.total_frames is not None:
            res["totalFrames"] = self.total_frames
        if self.exported_at is not None:
            res["exportedAt"] = self.exported_at
        if self.notes is not None:
            res["notes"] = self.notes
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PoseSequenceMetadata:
        return cls(
            pose_sdk=str(data.get("poseSdk", "@mediapipe/tasks-vision")),
            coordinate_convention=str(
                data.get("coordinateConvention", "normalized-3d-hip-relative-z")
            ),
            pose_model_version=data.get("poseModelVersion"),
            capture_cadence_fps=(
                float(data["captureCadenceFps"])
                if "captureCadenceFps" in data and data["captureCadenceFps"] is not None
                else None
            ),
            duration_ms=(
                float(data["durationMs"])
                if "durationMs" in data and data["durationMs"] is not None
                else None
            ),
            total_frames=(
                int(data["totalFrames"])
                if "totalFrames" in data and data["totalFrames"] is not None
                else None
            ),
            exported_at=data.get("exportedAt"),
            notes=data.get("notes"),
        )


@dataclass
class PoseSequence:
    """Complete pose sequence contract (schemaVersion 1.0.0)."""

    schema_version: str
    capture_id: str
    started_at: str
    frames: List[PoseFrame]
    metadata: PoseSequenceMetadata = field(default_factory=PoseSequenceMetadata)
    ended_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "schemaVersion": self.schema_version,
            "captureId": self.capture_id,
            "startedAt": self.started_at,
            "frames": [f.to_dict() for f in self.frames],
            "metadata": self.metadata.to_dict(),
        }
        if self.ended_at is not None:
            res["endedAt"] = self.ended_at
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PoseSequence:
        raw_frames = data.get("frames", [])
        frames = [PoseFrame.from_dict(f) for f in raw_frames]
        raw_metadata = data.get("metadata", {})
        metadata = PoseSequenceMetadata.from_dict(raw_metadata)
        return cls(
            schema_version=str(data.get("schemaVersion", "")),
            capture_id=str(data.get("captureId", "")),
            started_at=str(data.get("startedAt", "")),
            frames=frames,
            metadata=metadata,
            ended_at=data.get("endedAt"),
        )


@dataclass
class ManifestEntry:
    """Sequence metadata and label in dataset manifest."""

    sequence_id: str
    path: str
    schema_version: str
    label: str  # 'fall' | 'normal'
    subject_id: str
    session_id: str
    source_dataset: str
    event_start_ms: Optional[int] = None
    event_end_ms: Optional[int] = None
    camera_view: Optional[str] = None
    activity_type: Optional[str] = None  # e.g., 'standing', 'walking', 'sitting', 'trip_fall', etc.
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "sequence_id": self.sequence_id,
            "path": self.path,
            "schema_version": self.schema_version,
            "label": self.label,
            "subject_id": self.subject_id,
            "session_id": self.session_id,
            "source_dataset": self.source_dataset,
        }
        if self.event_start_ms is not None:
            res["event_start_ms"] = self.event_start_ms
        if self.event_end_ms is not None:
            res["event_end_ms"] = self.event_end_ms
        if self.camera_view is not None:
            res["camera_view"] = self.camera_view
        if self.activity_type is not None:
            res["activity_type"] = self.activity_type
        if self.notes is not None:
            res["notes"] = self.notes
        return res

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> ManifestEntry:
        return cls(
            sequence_id=str(data["sequence_id"]),
            path=str(data["path"]),
            schema_version=str(data.get("schema_version", CURRENT_SCHEMA_VERSION)),
            label=str(data["label"]),
            subject_id=str(data["subject_id"]),
            session_id=str(data["session_id"]),
            source_dataset=str(data.get("source_dataset", "unknown")),
            event_start_ms=int(data["event_start_ms"]) if "event_start_ms" in data and data["event_start_ms"] is not None else None,
            event_end_ms=int(data["event_end_ms"]) if "event_end_ms" in data and data["event_end_ms"] is not None else None,
            camera_view=data.get("camera_view"),
            activity_type=data.get("activity_type"),
            notes=data.get("notes"),
        )
