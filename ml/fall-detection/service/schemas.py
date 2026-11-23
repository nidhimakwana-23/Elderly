"""Pydantic schemas for the fall detection inference service API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LandmarkSchema(BaseModel):
    x: float
    y: float
    z: Optional[float] = None
    visibility: Optional[float] = None


class FrameQualitySchema(BaseModel):
    poseDetected: bool
    validLandmarkCount: int
    expectedLandmarkCount: int = 33


class PoseFrameSchema(BaseModel):
    timestampMs: float
    frameIndex: int
    landmarks: List[LandmarkSchema]
    quality: FrameQualitySchema


class PredictRequest(BaseModel):
    schema_version: str = Field(default="1.0.0", description="Schema version of pose sequence")
    frames: List[PoseFrameSchema] = Field(..., description="Chronological sequence of pose frames")


class WindowResponse(BaseModel):
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None


class PredictResponse(BaseModel):
    label: Optional[str] = Field(None, description="'fall', 'normal', or null if invalid")
    fall_score: float = Field(..., description="Fall risk score between 0.0 and 1.0")
    is_valid: bool = Field(..., description="Whether inference succeeded on a valid window")
    reason: Optional[str] = Field(None, description="Explanation when window is invalid")
    model_version: str = Field(..., description="Version of model used for inference")
    window: WindowResponse = Field(..., description="Window boundary timestamps in ms")


class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    threshold: float
    feature_count: int
    target_cadence_hz: float
    min_frames_per_window: int
    feature_names: List[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str
