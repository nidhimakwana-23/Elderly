"""FastAPI application for the ML Fall Detection inference service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import LOG_LEVEL
from .dependencies import get_classifier
from .schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    WindowResponse,
)

logging.basicConfig(level=LOG_LEVEL.upper())
logger = logging.getLogger("fall_detection_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler: loads model once during startup."""
    try:
        classifier = get_classifier()
        logger.info(f"Model {classifier.model_version} loaded on startup.")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")
        # We don't crash here so healthcheck can report failure if needed
    yield


app = FastAPI(
    title="Elderly Fall Detection Inference Service",
    description="Internal private inference service for real-time fall detection using MediaPipe pose windows.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Service health check endpoint."""
    try:
        classifier = get_classifier()
        return HealthResponse(
            status="healthy",
            model_loaded=True,
            model_version=classifier.model_version,
        )
    except Exception as e:
        return HealthResponse(
            status=f"degraded: {str(e)}",
            model_loaded=False,
            model_version="unknown",
        )


@app.get("/internal/v1/model-info", response_model=ModelInfoResponse)
def get_model_info() -> ModelInfoResponse:
    """Return metadata about the loaded fall detection classifier."""
    try:
        classifier = get_classifier()
        return ModelInfoResponse(
            model_name=classifier.metadata.get("model_name", "random_forest"),
            model_version=classifier.model_version,
            threshold=classifier.threshold,
            feature_count=len(classifier.feature_names),
            target_cadence_hz=classifier.target_cadence_hz,
            min_frames_per_window=classifier.min_frames,
            feature_names=classifier.feature_names,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model unavailable: {str(e)}",
        )


@app.post("/internal/v1/predict", response_model=PredictResponse)
def predict_pose_window(request: PredictRequest) -> PredictResponse:
    """Run fall detection classifier on a temporal window of pose frames.

    Accepts a chronological sequence of serialized MediaPipe pose frames,
    validates the window quality, extracts features, and outputs a fall score.
    """
    try:
        classifier = get_classifier()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Inference model not initialized: {str(e)}",
        )

    # Convert Pydantic frames to dicts compatible with PoseFrame.from_dict
    raw_frames = [frame.model_dump() for frame in request.frames]

    try:
        result = classifier.predict(raw_frames)
    except Exception as e:
        logger.warning(f"Inference error during processing: {e}")
        return PredictResponse(
            label=None,
            fall_score=0.0,
            is_valid=False,
            reason=f"Inference processing error: {str(e)}",
            model_version=classifier.model_version,
            window=WindowResponse(start_ms=None, end_ms=None),
        )

    window_info = result.get("window", {})
    return PredictResponse(
        label=result.get("label"),
        fall_score=result.get("fall_score", 0.0),
        is_valid=result.get("is_valid", False),
        reason=result.get("reason"),
        model_version=result.get("model_version", classifier.model_version),
        window=WindowResponse(
            start_ms=window_info.get("start_ms"),
            end_ms=window_info.get("end_ms"),
        ),
    )
