# Elderly Fall Detection ML Module (Milestone C)

This module provides the machine-learning pipeline for detecting falls from temporal body pose sequences captured by the Elderly web application (Milestones A & B).

It handles data contract validation, temporal resampling, spatial-temporal feature extraction, leakage-free grouped splitting, baseline classifier training, validation threshold optimization, artifact bundling, and an isolated Python inference API.

---

## 1. System Context & Milestone Boundaries

```text
  [Browser Camera]
         │
         ▼
  [MediaPipe Pose Landmarker] (@mediapipe/tasks-vision)
         │
         ▼
  [Pose Sequence Rolling Buffer] (Milestone B: Schema 1.0.0)
         │
         ▼ JSON Export
  =========================== MILESTONE C ===========================
  [Schema Validation & Ingestion] (schema.py, ingest.py, validation.py)
         │
         ▼
  [Temporal Resampling & Normalization] (preprocessing.py)
         │
         ▼
  [Sliding Window Generation & Labelling] (windowing.py)
         │
         ▼
  [Feature Extraction] (features.py)
         │
         ▼
  [Grouped Splitting (Subject/Session)] (splits.py)
         │
         ▼
  [Model Training & Baseline Comparison] (training.py)
         │
         ▼
  [Artifact Bundling & Versioning] (artifacts.py)
         │
         ▼
  [Python Inference Interface] (inference.py)
  =========================== MILESTONE D ===========================
  [Rolling Window Inference Integration]
         │
         ▼
  [Temporal Confirmation & Caregiver Alert Workflow]
```

- **Milestone A (Complete):** Browser camera capture, MediaPipe Pose Landmarker, and skeleton canvas overlay.
- **Milestone B (Complete):** Bounded rolling sequence buffer (300 frames, 10 seconds), schema `1.0.0`, explicit JSON export.
- **Milestone C (This Module):** Python dataset ingestion, preprocessing, training, evaluation, versioned model artifact, and inference contract.
- **Milestone D (Future):** Online rolling inference integration in application, temporal confirmation filter, backend fall events, and caregiver notifications.

> [!IMPORTANT]
> Milestone C contains **no emergency alert dispatching, no backend event persistence, and no clinical diagnostic claims**. It evaluates movement kinematics from pose landmarks alone and preserves privacy by default (no raw video is accepted or processed).

---

## 2. Data Contract & Schema Audit

This module consumes pose sequences matching the Milestone B export format (`fe/src/features/fall-detection/types/pose-sequence.types.ts`).

### Schema Characteristics:
- **Schema version:** `1.0.0`
- **Topology:** 33 MediaPipe body landmarks (indices 0..32, from `nose` to `right_foot_index`).
- **Coordinate convention:**
  - $x \in [0.0, 1.0]$: normalized to frame width ($0$ is left, $1$ is right).
  - $y \in [0.0, 1.0]$: normalized to frame height ($0$ is top, $1$ is bottom).
  - $z$: depth relative to midpoint of hips (smaller values closer to camera).
  - `visibility`, `presence`: confidence in $[0.0, 1.0]$.
- **Frame quality metadata:** `validLandmarkCount`, `expectedLandmarkCount` (33), `poseDetected`, `meanVisibility`.

### Missing Coordinate Handling Decision:
In Milestone B's frontend serializer (`poseSerializer.ts`), non-finite coordinates are sanitized to `0.0`. Because $(0, 0)$ can also represent the top-left boundary of the video frame, coordinates cannot be judged valid or missing by numeric value alone.
- **Pipeline Strategy:**
  1. A landmark is considered valid **only** if coordinates are finite numbers AND visibility $\ge \text{min\_visibility}$ (default $0.30$).
  2. For every sequence and window, a boolean `validity_mask` of shape $(T, 33)$ is computed and tracked.
  3. Preprocessing resamples coordinates using linear interpolation across small gaps ($\le 350\text{ ms}$), but marks gaps $> 350\text{ ms}$ as invalid without interpolating smooth motion across missing subjects.
  4. Windows with valid landmark ratio $< 0.25$ or insufficient usable frames are rejected during inference rather than erroneously classified as normal.

---

## 3. Directory Structure

```text
ml/fall-detection/
├── configs/
│   └── baseline.yaml              # Hyperparameters and pipeline configuration
├── data/
│   ├── README.md
│   ├── raw/                       # Raw exported PoseSequence JSONs (git-ignored)
│   ├── interim/                   # Normalized/resampled cache (git-ignored)
│   └── processed/                 # Processed NPZ matrices and metadata (git-ignored)
├── manifests/
│   ├── dataset_manifest.example.json # Documented schema for dataset annotations
│   ├── dataset_manifest.json     # Active manifest (git-ignored)
│   └── split_manifest.json       # Grouped train/val/test assignments (git-ignored)
├── models/
│   ├── README.md
│   └── <model>_baseline/          # Artifact bundle (model.joblib, metadata.json)
├── reports/
│   ├── README.md
│   ├── dataset_validation_report.json
│   ├── data_preparation_report.json
│   ├── training_report.json
│   ├── test_evaluation_report.json
│   └── evaluation_summary.md
├── scripts/
│   ├── validate_dataset.py       # Validates sequences and manifest against schema
│   ├── prepare_dataset.py        # Resampling, windowing, and grouped splits
│   ├── train.py                  # Trains baselines and exports versioned artifact
│   ├── evaluate.py               # Evaluates on held-out test split
│   └── generate_synthetic_corpus.py # Test fixture generator
├── src/
│   └── fall_detection/
│       ├── __init__.py
│       ├── schema.py             # Data classes and constants
│       ├── ingest.py             # Sequence & manifest loaders
│       ├── validation.py         # Structural and semantic validation
│       ├── preprocessing.py      # Uniform cadence resampling & hip normalization
│       ├── windowing.py          # Sliding window generator & label assignment
│       ├── features.py           # Spatial-temporal kinematics & quality metrics
│       ├── splits.py             # Group-aware splitting with leakage checks
│       ├── training.py           # Scikit-learn pipeline & baseline comparison
│       ├── evaluation.py         # Metrics, threshold optimization & error analysis
│       ├── artifacts.py          # Save/load versioned artifact bundles
│       └── inference.py          # Python inference API (FallClassifier)
├── tests/                        # 31 unit & integration tests
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 4. Environment Setup

Python 3.10+ is required.

```bash
cd ml/fall-detection

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies and package in editable mode
pip install -r requirements.txt
pip install -e .
```

---

## 5. Developer Workflow

### Step 1: Generate or Place Labelled Data
If working with real consented recordings or converted public datasets, place raw `.json` files in `data/raw/` and configure `manifests/dataset_manifest.json`.

To populate the development environment with synthetic multi-subject fixtures:
```bash
python scripts/generate_synthetic_corpus.py
```

### Step 2: Validate Dataset and Manifest
```bash
python scripts/validate_dataset.py --config configs/baseline.yaml
```
Output: `reports/dataset_validation_report.json`.

### Step 3: Preprocess, Window, and Split
```bash
python scripts/prepare_dataset.py --config configs/baseline.yaml
```
Output:
- `manifests/split_manifest.json`: Subject-isolated split assignments.
- `data/processed/dataset.npz`: Feature matrices and labels ($X_{train}, y_{train}, X_{val}, y_{val}, X_{test}, y_{test}$).
- `reports/data_preparation_report.json`.

### Step 4: Train Baselines & Optimize Validation Threshold
```bash
python scripts/train.py --config configs/baseline.yaml
```
- Fits `LogisticRegression` and `RandomForestClassifier` pipelines on training data only.
- Optimizes operating decision threshold on validation data.
- Saves versioned artifact bundle to `models/<model_name>_baseline/`.
- Output: `reports/training_report.json`.

### Step 5: Evaluate on Held-Out Test Split
```bash
python scripts/evaluate.py --config configs/baseline.yaml
```
Output:
- `reports/test_evaluation_report.json`
- `reports/evaluation_summary.md`

### Step 6: Run Tests
```bash
pytest
```

---

## 6. Preprocessing & Feature Extraction

### Preprocessing Pipeline:
1. **Cadence Resampling:** Input sequences (which vary between 20-35 FPS in browser sessions) are resampled to a uniform cadence ($20.0\text{ Hz}$, $50\text{ ms}$ intervals). Linear interpolation is applied only across short gaps ($\le 350\text{ ms}$).
2. **Anchor & Scale Normalization:**
   - Anchor: Midpoint of left and right hips $(\text{mid\_hip})$.
   - Scale: Torso length between mid-shoulder and mid-hip.
   - Normalized coordinates: $(x - x_{hip}) / L_{torso}$, $(y - y_{hip}) / L_{torso}$.
   - Preserves global vertical frame position ($y_{hip} \in [0, 1]$), which contains the crucial physical drop signal.

### Feature Representations:
- **Geometry features:**
  - `torso_angle_mean`, `torso_angle_max`, `torso_angle_min`, `torso_angle_range`: Torso angle relative to vertical axis (upright $\approx 0^\circ$, horizontal $\approx 90^\circ$).
  - `aspect_ratio_mean`, `aspect_ratio_max`: Body bounding-box width-to-height ratio ($< 0.6$ upright, $> 1.2$ lying down).
  - `hip_y_mean`, `hip_y_max`: Vertical position in camera frame.
  - `horizontal_duration_ratio`: Fraction of window where torso angle $> 60^\circ$.
- **Temporal derivative features:**
  - `torso_angle_max_rate`: Maximum angular velocity ($\Delta \theta / \Delta t$).
  - `hip_y_delta`: Total vertical displacement.
  - `hip_max_downward_velocity`: Maximum downward velocity ($dy/dt$).
  - `hip_vertical_acceleration`: Peak downward acceleration.
  - `post_drop_stability`: Residual motion in final third of window (distinguishes falls from controlled lying down).
  - `motion_energy_total`: Kinetic energy across key body joints.
- **Quality indicators:**
  - `mean_landmark_visibility`, `valid_landmark_fraction`, `low_quality_frame_count`.

---

## 7. Leakage-Free Splitting Strategy

A primary failure mode in temporal video classification is random-window splitting, which leaks overlapping frames from the same recording into test splits.

- **Primary Splitting Group:** `subject_id` (grouped-stratified).
- All sequences, recording sessions, and sliding windows belonging to a subject are strictly confined to a single split (Train, Validation, or Test).
- `assert_no_leakage()` strictly validates before training that:
  $$\text{Train Subjects} \cap \text{Val Subjects} = \emptyset$$
  $$\text{Train Subjects} \cap \text{Test Subjects} = \emptyset$$
  $$\text{Val Subjects} \cap \text{Test Subjects} = \emptyset$$

---

## 8. Python Inference Contract

The module exposes an isolated Python inference API independent of frontend code or network transport:

```python
from fall_detection.inference import FallClassifier

# Load versioned model bundle
classifier = FallClassifier.load("models/random_forest_baseline")

# Predict from a raw list of PoseFrames or dicts
result = classifier.predict(frames)
```

### Result Schema:
```json
{
  "label": "fall",
  "fall_score": 0.89,
  "is_valid": True,
  "reason": null,
  "model_version": "1.0.0",
  "window": {
    "start_ms": 1333,
    "end_ms": 2283
  }
}
```

### Quality Failure Handling:
If input has insufficient frames or missing landmarks, the classifier returns:
```json
{
  "label": null,
  "fall_score": 0.0,
  "is_valid": False,
  "reason": "Insufficient usable body landmarks (valid ratio: 0.12 < 0.25)",
  "model_version": "1.0.0",
  "window": { "start_ms": 100, "end_ms": 1100 }
}
```
> [!NOTE]
> Degraded or occluded input is **never silently classified as normal activity**.

---

## 9. Dataset Provenance & Real-World Limitations

1. **Current Corpus:** The automated test suite utilizes a deterministic synthetic kinematic corpus simulating human movement profiles (standing sway, sitting transitions, intentional slow lying down, forward trip falls, and backward collapse falls).
2. **Real-world Data Requirement:** Training a production-grade classifier requires collecting consented recordings from adult volunteers and converting verified public fall-detection benchmark video datasets (e.g., UR Fall Detection, Le2i, UP-Fall) using MediaPipe Pose Landmarker.
3. **No Clinical Validation:** This software is a research prototype. It has not undergone clinical trials and must not be used as an exclusive life-safety monitor.

---

## 10. Milestone D Integration Boundary

Milestone D will connect this classifier to the product application:
1. **Inference Service:** Deploy `FallClassifier` in a lightweight Python backend service or export the trained pipeline to ONNX for browser runtime execution.
2. **Online Rolling Assessment:** Form rolling windows from live browser MediaPipe landmark streams every $500\text{ ms}$.
3. **Temporal Confirmation Filter:** Require consecutive elevated fall scores across multiple windows (e.g. 2 of 3 windows) plus post-fall inactivity before confirming an event.
4. **Caregiver Workflow:** Persist confirmed fall events to the database and dispatch caregiver notifications with opt-in user acknowledgement.
