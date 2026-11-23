"""Tests for the Python FastAPI Fall Detection inference service."""

import pytest
from fastapi.testclient import TestClient

from service.app import app
from service.dependencies import reset_classifier


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_classifier()
    yield
    reset_classifier()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["model_version"] == "1.0.0"


def test_model_info_endpoint(client):
    response = client.get("/internal/v1/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_version"] == "1.0.0"
    assert data["model_name"] == "random_forest"
    assert "torso_angle_mean" in data["feature_names"]
    assert data["threshold"] == 0.1
    assert data["min_frames_per_window"] == 25


def test_predict_valid_window(client, sample_fall_sequence):
    seq, _ = sample_fall_sequence
    frames_dict = [f.to_dict() for f in seq.frames[:30]]

    payload = {
        "schema_version": "1.0.0",
        "frames": frames_dict,
    }

    response = client.post("/internal/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["label"] in ("fall", "normal")
    assert 0.0 <= data["fall_score"] <= 1.0
    assert data["model_version"] == "1.0.0"
    assert data["window"]["start_ms"] is not None
    assert data["window"]["end_ms"] is not None


def test_predict_insufficient_frames(client, sample_fall_sequence):
    seq, _ = sample_fall_sequence
    # Only 5 frames (minimum is 25)
    frames_dict = [f.to_dict() for f in seq.frames[:5]]

    payload = {
        "schema_version": "1.0.0",
        "frames": frames_dict,
    }

    response = client.post("/internal/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert "minimum is 25" in data["reason"]
    assert data["label"] is None
    assert data["fall_score"] == 0.0


def test_predict_empty_frames(client):
    payload = {
        "schema_version": "1.0.0",
        "frames": [],
    }

    response = client.post("/internal/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert data["label"] is None
