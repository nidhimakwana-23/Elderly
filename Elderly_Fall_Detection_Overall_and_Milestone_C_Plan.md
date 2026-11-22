# Elderly Care — Fall Detection System Overview & Milestone C Implementation Plan

**Target repository:** `nidhimakwana-23/Elderly`  
**Target branch reviewed:** `feat/fall-detection-milestone-b`  
**Primary focus:** Milestone C — Dataset Preparation, Model Training, Evaluation & Export  
**Status at planning time:** Milestones A and B are implemented; Milestone C is the next development phase.

---

## 1. Purpose

The Elderly application is being extended with a browser-based fall-detection capability. The system uses a camera to observe a person, MediaPipe Pose Landmarker to convert video frames into body landmarks, and a custom machine-learning model to classify temporal movement patterns as a possible fall or normal activity.

The project is intentionally divided into milestones so that camera capture, pose extraction, model development, and emergency workflows remain independently testable.

**Milestone C is an ML research and engineering phase.** Its output is a reproducible, evaluated classifier and a stable inference interface. It does not yet implement caregiver alerts, event persistence, or a production emergency workflow.

## 2. Overall system idea

```text
                    ELDERLY WEB APPLICATION
                              |
                              v
                    Fall Detection Demo Page
                              |
                              v
                       Browser Camera
                              |
                              v
                  MediaPipe Pose Landmarker
                  @mediapipe/tasks-vision
                              |
                              v
                 Pose landmarks for each frame
                              |
                 +------------+-------------+
                 |                          |
                 v                          v
          Live skeleton overlay      Pose sequence capture
          (Milestone A)               (Milestone B)
                                            |
                                            v
                                  Versioned JSON sequences
                                  Schema 1.0.0
                                            |
                                            v
                              Dataset preparation (C)
                                            |
                                            v
                              Temporal window generation
                                            |
                                            v
                              Feature extraction / quality
                                            |
                                            v
                              Train and evaluate classifier
                                            |
                                            v
                              Versioned model artifacts
                                            |
                                            v
                              Inference interface (C)
                                            |
                                            v
                                Milestone D integration
                                            |
                                            v
                           Rolling-window fall assessment
                                            |
                                            v
                             Temporal confirmation logic
                                            |
                                            v
                           Backend event + caregiver workflow
```

### Core principles

- **Pose-first architecture:** The classifier consumes structured pose data, not raw camera frames.
- **No raw video dependency:** Milestone C works from exported pose-sequence JSON and does not need access to a webcam.
- **Temporal classification:** A fall is a movement event. A single pose frame is not a sufficient input.
- **Reuse the existing contract:** Treat the Milestone B schema as the source data contract.
- **Reproducibility:** Dataset versions, preprocessing configuration, splits, model settings, and evaluation results must be recorded.
- **Privacy by default:** Pose sequences are sensitive movement data even when they contain no video or direct identifiers.
- **Honest evaluation:** Do not claim clinical validation or general fall-detection reliability from a small or non-representative dataset.

---

## 3. Current repository state

The plan is based on inspection of the target branch and the files present there.

### 3.1 Milestone A — live pose capture (implemented)

The frontend implementation is under:

```text
fe/src/features/fall-detection/
├── pages/
│   └── FallDetectionDemoPage.tsx
├── components/
│   ├── CameraPreview.tsx
│   ├── PoseOverlay.tsx
│   ├── PoseSequencePanel.tsx
│   └── PoseStatusPanel.tsx
├── hooks/
│   ├── useCamera.ts
│   ├── usePoseLandmarker.ts
│   └── usePoseSequenceCapture.ts
├── utils/
│   ├── poseDrawing.ts
│   ├── poseExporter.ts
│   ├── poseSequenceBuffer.ts
│   └── poseSerializer.ts
├── types/
│   ├── pose-sequence.types.ts
│   └── pose.types.ts
├── __tests__/
│   └── milestone-b.test.ts
└── README.md
```

The frontend package declares `@mediapipe/tasks-vision` as a dependency. The repository also contains the pose model asset at:

```text
fe/public/models/pose_landmarker_lite.task
```

The camera, MediaPipe inference, and overlay are already part of the feature. Milestone C must not reimplement them.

### 3.2 Milestone B — pose sequence capture (implemented)

Milestone B has established an application-owned sequence format and supporting utilities:

- `PoseLandmark`, `PoseFrame`, and `PoseSequence` types.
- Schema version `1.0.0`.
- A fixed 33-landmark MediaPipe ordering.
- Frame timestamps and frame indices.
- Landmark visibility/presence and frame-quality metadata.
- A bounded in-memory rolling buffer.
- Explicit JSON export rather than automatic persistence.
- Tests covering serialization, buffer behavior, and export.

The current buffer defaults are 10,000 ms and 300 frames. The feature README describes observed browser capture cadence as approximately 25–35 FPS and suggests that downstream training may resample sequences to a uniform cadence.

### 3.3 Existing Python ML conventions

The repository has `ml/intent-classifier/`, a separate Python ML module. It uses scripts located relative to `__file__`, a `requirements.txt`, scikit-learn, and joblib artifacts.

That module is for natural-language intent classification and is not a fall-detection model. Do not modify its dataset, model, prediction behavior, or dependencies for this milestone. Use it only as a reference for repository-level Python conventions where appropriate.

### 3.4 What is not present yet

The inspected tree contains no `ml/fall-detection/` module, no fall-pose training dataset, and no fall classifier artifacts. The existing intent-classifier dataset is unrelated and must not be reused.

The repository's Milestone B JSON export is the starting input format, but labelled fall and non-fall sequences still need to be sourced or collected.

---

## 4. Milestone boundaries

| Milestone | Responsibility | Status |
|---|---|---|
| A — Live pose capture | Camera, MediaPipe inference, skeleton overlay, lifecycle and status | Complete |
| B — Pose sequence capture | Versioned pose frames, timestamps, bounded buffer, explicit JSON export | Complete |
| C — ML model development | Labelled dataset, preprocessing, temporal features, training, evaluation, model artifact and inference interface | **Next** |
| D — Product integration | Rolling inference in the application, decision confirmation, backend events, caregiver notifications and event review | Future |

### Milestone C definition of success

At the end of C, a developer should be able to:

1. Install the Python ML module's dependencies.
2. Point the pipeline at a documented collection of labelled pose-sequence JSON files.
3. Validate and preprocess those files.
4. Generate temporal training windows without leaking subjects or sessions across data splits.
5. Train a baseline classifier.
6. Evaluate it on held-out subjects or recording sessions.
7. Save the complete preprocessing/model artifact and metadata.
8. Load the artifact and predict from a pose window using a documented Python API.
9. Reproduce the evaluation from the recorded configuration and split manifest.

No alert should be sent by this module.

---

# 5. Milestone C — detailed implementation roadmap

## C0. Repository and data-contract audit

Before writing training code:

1. Re-read `fe/src/features/fall-detection/README.md` and `pose-sequence.types.ts`.
2. Inspect `poseSerializer.ts`, `poseSequenceBuffer.ts`, and `poseExporter.ts` to verify actual runtime behavior against the documented schema.
3. Export representative sequences from the frontend:
   - Normal standing/walking.
   - Sitting and standing.
   - Intentional lying down.
   - A short sequence with partial visibility or no-pose gaps, if available.
4. Keep these as non-identifying fixtures for pipeline tests only when consent and project policy allow it.
5. Record the exact schema version, MediaPipe package version, model asset name/version, coordinate conventions, and capture metadata.
6. Decide the initial supported input contract: exported `PoseSequence` JSON with schema version `1.0.0`.

**Important data-quality issue to resolve:** `poseSerializer.ts` currently sanitizes invalid X/Y values by replacing them with `0`. Zero is a valid normalized coordinate, so the training pipeline cannot infer from X/Y alone whether a coordinate was missing. Before collecting a training corpus, choose and document a safe strategy:
- Prefer preserving invalid/missing status explicitly in a schema-compatible way or introducing a carefully versioned schema update.
- If the exported schema cannot change immediately, treat the existing `quality` fields and landmark confidence fields as available indicators, document the limitations, and reject or mask ambiguous values rather than treating every zero as a true measurement.
- Add tests that prove missing values cannot silently become plausible body movement.

Do not silently change the frontend schema in this milestone without coordinating the impact on existing exports. A schema migration, if needed, must be explicit and versioned.

**Deliverables**
- Data-contract audit note.
- A small set of validated example sequences or synthetic fixtures.
- A written decision on missing-landmark representation.
- Input schema validation tests.

## C1. Create a separate fall-detection ML module

Create:

```text
ml/
├── intent-classifier/              # existing; leave unchanged
└── fall-detection/
    ├── README.md
    ├── requirements.txt
    ├── configs/
    │   └── baseline.yaml
    ├── data/
    │   ├── README.md
    │   ├── raw/                    # ignored by git; source datasets / exports
    │   ├── interim/                # ignored by git; validated/normalized data
    │   └── processed/              # ignored by git; generated windows/features
    ├── manifests/
    │   └── dataset_manifest.example.json
    ├── models/                     # generated artifacts; ignore large binaries
    ├── reports/
    │   └── .gitkeep
    ├── src/
    │   └── fall_detection/
    │       ├── __init__.py
    │       ├── schema.py
    │       ├── ingest.py
    │       ├── validation.py
    │       ├── preprocessing.py
    │       ├── windowing.py
    │       ├── features.py
    │       ├── splits.py
    │       ├── training.py
    │       ├── evaluation.py
    │       ├── inference.py
    │       └── artifacts.py
    ├── scripts/
    │   ├── validate_dataset.py
    │   ├── prepare_dataset.py
    │   ├── train.py
    │   └── evaluate.py
    └── tests/
        ├── test_schema.py
        ├── test_validation.py
        ├── test_preprocessing.py
        ├── test_windowing.py
        ├── test_features.py
        ├── test_splits.py
        └── test_inference.py
```

This is a proposed structure, not a claim that these files already exist. Adapt it if the repository's Python conventions suggest a simpler layout, but keep ingestion, preprocessing, training, evaluation, and inference independently testable.

Use a virtual environment and pin compatible dependency versions after verifying the supported Python version. Likely dependencies include NumPy, pandas, scikit-learn, joblib, PyYAML, and pytest. Avoid adding TensorFlow or PyTorch for the initial classical baseline.

**Deliverables**
- Separate `ml/fall-detection/` module.
- Reproducible environment and setup instructions.
- No changes to `ml/intent-classifier/`.

## C2. Dataset sourcing and labelling

### 2.1 Dataset strategy

The model needs labelled pose sequences, not isolated pose frames. Use one or more appropriate public fall-detection datasets if their video source, licensing, subject metadata, camera viewpoint, and usage terms are suitable.

Possible routes:
- Obtain a public video-based fall dataset and run the same MediaPipe pose-extraction version on its videos to generate pose sequences.
- Collect project-specific pose sequences with informed consent and a documented capture protocol.
- Use a combination, but keep dataset source and provenance attached to each sequence.

Do not assume that an existing dataset already matches the application's schema. If it contains videos rather than pose landmarks, create a reproducible conversion process using the documented MediaPipe model/version and the same 33-landmark mapping.

Do not ask elderly participants to perform dangerous falls. If staged falls are needed, use consenting, physically capable adults and appropriate safety precautions. Check licenses and subject permissions before using or redistributing data.

### 2.2 Initial class definitions

Start with a binary classification task:

- `fall`: a labelled fall event sequence/window.
- `normal`: ordinary movement or activity without a fall event.

Keep the binary label mapping explicit and stable. Do not mix uncertain/unlabelled samples into either class.

### 2.3 Positive examples

Aim to cover variation in:
- Forward falls.
- Backward falls.
- Left/right sideways falls.
- Falls while walking or turning.
- Falls from standing.
- Falls associated with sitting or chair transitions, only if the chosen dataset supports them.
- Different event speeds and post-fall postures.

### 2.4 Negative examples and hard negatives

The negative class must include movements that resemble parts of a fall:
- Sitting down and standing up.
- Sitting down quickly.
- Intentional lying down and getting up.
- Bending to pick something up.
- Kneeling or crouching.
- Reaching toward the floor.
- Walking, turning, and changing direction.
- Getting into or out of bed, if in scope.
- Partial body visibility and ordinary occlusion.
- Normal movement with camera viewpoint variation.

Lying down is particularly important: a low or horizontal posture alone must not be treated as a fall.

### 2.5 Annotation format

Create a manifest rather than embedding labels in ad hoc filenames. Each sequence record should include fields equivalent to:

```json
{
  "sequence_id": "anonymous-sequence-id",
  "path": "raw/example-sequence.json",
  "schema_version": "1.0.0",
  "label": "fall",
  "subject_id": "subject-001",
  "session_id": "session-001",
  "source_dataset": "dataset-name-or-consented-capture",
  "event_start_ms": 4200,
  "event_end_ms": 6100,
  "camera_view": "side",
  "notes": ""
}
```

The example is a proposed manifest, not an existing dataset record. Use pseudonymous subject/session keys for split grouping; do not put names, contact details, or patient identifiers in the manifest.

For falls, annotate the event interval and define how windows are labelled:
- Positive windows overlap the annotated fall interval according to a documented rule.
- Normal windows must not overlap fall events.
- Ambiguous transition windows should be excluded or separately marked, not forced into a class.
- Record whether the sequence includes pre-event, event, and post-event context.

### 2.6 Dataset audit report

Before training, report:
- Number of source sequences.
- Number of subjects and recording sessions.
- Counts by class.
- Counts by fall subtype and activity subtype where available.
- Duration distribution.
- Camera-view distribution.
- Capture FPS distribution.
- Missing-pose and low-visibility rates.
- Source/license/provenance.
- Label completeness and ambiguous samples.

Do not invent sample counts. The pipeline should calculate these from the actual manifest.

**Gate:** Do not proceed to model evaluation claims until the dataset is sufficiently labelled and subject/session identifiers are available for leakage-resistant splitting. If identifiers are unavailable, clearly report the limitation and do not present random-window test metrics as subject-independent performance.

## C3. Ingestion and validation

Implement a deterministic loader for the Milestone B `PoseSequence` JSON format.

Validate:
- `schemaVersion` is supported.
- `captureId` exists but is not treated as a personal identifier.
- `frames` is a non-empty list.
- Frame timestamps and indices are valid and ordered according to the documented policy.
- Each frame has the expected landmark ordering/count (33 for the current contract).
- Coordinate and confidence values are finite and within their documented ranges where applicable.
- Optional `z`, `visibility`, and `presence` fields are handled safely.
- Frame quality fields are internally consistent.
- Sequence metadata is parsed without assuming optional fields are always present.
- Duplicate timestamps, gaps, and irregular cadence are detected and reported.
- Unknown schema versions fail with a useful error rather than being guessed.

Validation should produce a structured report with errors and warnings. Bad files should be traceable to a sequence ID and frame index. Do not silently drop malformed files or frames.

**Deliverables**
- JSON schema/typed parser.
- Dataset validation command.
- Machine-readable validation report.
- Tests for valid, malformed, partial, empty, and unsupported-version inputs.

## C4. Preprocessing and temporal resampling

The browser records at a variable cadence. Training windows need a consistent time axis.

### 4.1 Preserve original observations

Keep raw exported JSON unchanged. All cleaning and resampling should create derived data in `interim/` or `processed/`.

### 4.2 Uniform cadence

- Measure each sequence's actual cadence from timestamps.
- Select a baseline target cadence after inspecting the real data (for example, compare 20 Hz and 30 Hz rather than assuming one is correct).
- Resample based on timestamps, not frame index alone.
- Interpolate only across short, acceptable gaps.
- Do not interpolate across long occlusion/no-pose gaps as if the person moved smoothly.
- Preserve masks/quality indicators for interpolated or unavailable landmarks.
- Document the interpolation method and maximum allowed gap.

### 4.3 Coordinate normalization

The current schema documents normalized X/Y relative to the video frame and Z relative to the hips. Evaluate a person-relative normalization that reduces sensitivity to image scale and camera distance.

A practical baseline to compare:
- Translate coordinates relative to a stable body anchor such as the midpoint of the hips.
- Scale by a robust body-size estimate, such as shoulder-to-hip distance or torso length, when those landmarks are visible.
- Preserve a separate representation of global vertical position and body-to-frame position if it carries useful fall information.
- Avoid normalization that removes the vertical drop signal or makes distinct movement patterns indistinguishable.
- Keep raw normalized coordinates available for comparison.

Do not use a normalization method that assumes a landmark is valid when its confidence is low. Define a fallback and quality mask.

### 4.4 Missing landmarks

- Use `visibility` and `presence` where available, plus the frame-level quality fields.
- Keep missingness explicit with masks/validity features.
- Compare conservative frame rejection with masked/interpolated landmark handling.
- Do not convert absent coordinates into true zeros.
- Reject windows with insufficient usable pose data according to a documented threshold.
- Log how many sequences/windows are rejected and why.

### 4.5 Data-quality filtering

Define configurable thresholds for:
- Minimum usable landmarks per frame.
- Minimum usable frames per window.
- Maximum gap duration.
- Minimum sequence duration.

These are data-quality controls, not fall thresholds. Tune them on training/validation data and report their effect on retained data.

**Deliverables**
- Deterministic preprocessing module.
- Configurable cadence and missing-data policy.
- Unit tests for irregular timestamps, gaps, partial body, and invalid values.
- Preprocessing summary report.

## C5. Temporal window generation

Use fixed-duration windows so each training sample represents a short movement sequence.

The feature README suggests an initial fall-dynamics window in the range of 2–3 seconds (e.g. 60–90 frames at 30 FPS). Treat this as an experiment starting point, not a proven optimal setting.

Experiment with a small set of durations, for example:
- 2.0 seconds.
- 2.5 seconds.
- 3.0 seconds.

Choose the final window based on validation performance and detection latency, not training score alone.

Requirements:
- Generate windows using timestamps after resampling.
- Define a documented stride/overlap.
- Retain sequence ID, subject ID, session ID, start/end time, label, and quality summary for every window.
- Apply event-boundary labelling rules from the manifest.
- Do not let one window contain contradictory labels without an explicit policy.
- Keep windows from a source sequence grouped together during splitting.
- Prevent windows from crossing separate capture sessions.
- Store a window manifest for reproducibility.

**Deliverables**
- Window generator.
- Window manifest.
- Tests for exact boundaries, overlap, short sequences, event labels, and session separation.

## C6. Feature engineering

Begin with interpretable spatial and temporal features. Do not immediately introduce an LSTM or 1D CNN; the first objective is a defensible baseline that can be inspected and debugged.

### 6.1 Per-frame spatial features

Candidate features derived from the 33 landmarks:
- Left/right shoulder centre.
- Left/right hip centre and hip midpoint.
- Shoulder midpoint and torso centre.
- Shoulder width and hip width.
- Torso length.
- Torso angle relative to the vertical axis.
- Relative positions of shoulders, hips, knees, and ankles.
- Body bounding-box width, height, and aspect ratio, when enough landmarks are valid.
- Distances between selected joints.
- Landmark visibility/quality summaries.
- Relative body orientation proxies, with limitations documented.

Use the documented landmark index mapping in `pose-sequence.types.ts`. Keep the feature code independent of MediaPipe SDK objects; it should accept the application-owned numeric sequence representation.

### 6.2 Temporal features per window

Candidate window-level features:
- Minimum, maximum, mean, standard deviation, and range of torso angle.
- Maximum torso-angle change.
- Hip-centre vertical displacement.
- Maximum downward velocity of hip/torso centre.
- Vertical acceleration or change in velocity, if timestamps and smoothing support it.
- Body bounding-box aspect-ratio change.
- Joint-centre speed statistics.
- Duration spent in a low or near-horizontal posture.
- Stability or low-motion duration after a rapid downward movement.
- Change in shoulder-to-hip geometry.
- Missing-landmark fraction and mean visibility.
- Number/duration of low-quality frames.

Apply smoothing carefully before derivatives; noisy landmarks can create unrealistic velocity/acceleration spikes. Use timestamp-aware differences. Document units and coordinate direction.

### 6.3 Feature ablation

Compare at least:
1. Basic posture/geometry features.
2. Geometry plus temporal derivatives.
3. Geometry, temporal derivatives, and quality features.

This reveals whether added complexity improves validation results or merely overfits.

**Deliverables**
- Documented feature schema and stable feature ordering.
- Feature extraction module.
- Tests for known synthetic poses and timestamp-aware derivatives.
- Feature distribution/quality report.

## C7. Train/validation/test splitting

This is a critical part of the project.

**Never randomly split adjacent frames or overlapping windows from the same recording across train and test.** That leaks near-duplicate movement patterns and can make results look much better than real generalization.

Preferred split:
- Group by subject so a subject appears in only one of train, validation, or test.
- If subject IDs are unavailable, group by recording session at minimum and clearly state that this is weaker than subject-independent evaluation.
- Keep all windows from the same original sequence in one split.
- Use stratification at the group level where feasible so each split contains relevant classes.
- Fix and record random seeds.
- Save the exact sequence/group assignments to a split manifest.

Use:
- Training split for fitting model parameters.
- Validation split for model/window/threshold selection.
- Test split once for final, unbiased reporting.

If the dataset is too small for a stable three-way grouped split, consider grouped cross-validation on the development data and preserve a final held-out group if possible. Explain the limitations.

**Deliverables**
- Group-aware split generator.
- Split manifest.
- Leakage assertions/tests proving that sequence, subject, and session groups do not cross splits.

## C8. Baseline model training

Start with classical scikit-learn models over engineered temporal features.

Recommended initial candidates:
1. `LogisticRegression` — simple interpretable baseline.
2. `RandomForestClassifier` — primary baseline for nonlinear feature interactions.
3. `HistGradientBoostingClassifier` or another gradient-boosting baseline — optional comparison if dataset size supports it.

Do not assume Random Forest is best before comparing validation results.

Training requirements:
- Fit imputers/scalers/feature-selection steps only on training data, preferably inside a scikit-learn `Pipeline`.
- Avoid preprocessing leakage from validation/test data.
- Handle class imbalance using class weights or training-only resampling; never rebalance the validation/test sets.
- Record model hyperparameters and random seed.
- Tune a small, controlled parameter search on training/validation data.
- Use the same group-aware split for fair model comparison.
- Save the fitted preprocessing and classifier together as one inference artifact.
- Record the exact feature names/order and class mapping.

The first model is a binary window classifier: `fall` versus `normal`. The model should produce a score/probability for the fall class, but that score must not be described as calibrated unless calibration is separately evaluated.

**Deliverables**
- Reproducible training script.
- Baseline comparison report.
- Saved pipeline artifact.
- Training configuration and metadata.

## C9. Evaluation and threshold selection

Accuracy alone is not adequate, especially if normal-activity windows outnumber fall windows.

Report at minimum:
- Confusion matrix.
- Precision for the fall class.
- Recall/sensitivity for falls.
- Specificity.
- F1-score.
- Balanced accuracy.
- ROC-AUC where the held-out labels and score distribution make it meaningful.
- Precision-recall AUC where class imbalance makes it useful.
- Per-class support and class distribution.
- False positives and false negatives, with representative sequence IDs.
- Performance by fall subtype, activity type, camera view, and quality band where data allows.

For event-oriented interpretation, also report:
- Detection latency from annotated fall onset, where the data supports frame/window-level replay.
- False alarms per hour or per monitoring duration, using continuous sequences rather than treating correlated windows as independent events.
- Whether a fall is detected before, during, or only after the event interval.
- Results on hard negatives such as intentional lying down and sitting quickly.

### Threshold selection

- Select an operating threshold using validation data only.
- Show the precision/recall trade-off at candidate thresholds.
- Pay particular attention to missed falls and false alarms.
- Do not choose a threshold from the test set.
- Do not assume raw classifier probabilities are calibrated.
- If probability calibration is attempted, fit it without test leakage and document the calibration method.

The system should be described as a prototype/research classifier. It is not clinically validated and must not be used as the sole emergency-monitoring mechanism.

**Deliverables**
- Evaluation script and report.
- Confusion matrix and metric tables.
- Validation-based threshold recommendation with rationale.
- Error analysis.
- Explicit dataset and evaluation limitations.

## C10. Model artifact, versioning, and inference API

### 10.1 Artifact contents

Save a single versioned artifact or a tightly versioned artifact bundle containing:
- Fitted preprocessing steps.
- Fitted classifier.
- Feature names and exact feature order.
- Label mapping.
- Selected window duration, stride, and resampling cadence.
- Missing-data and normalization configuration.
- Decision threshold selected on validation data (if a threshold is part of the inference contract).
- Training dataset manifest/version hash.
- Split manifest reference.
- Training code/config version.
- Library versions.
- Evaluation summary and model version.

Use joblib for the initial scikit-learn pipeline, following the existing Python ML module's general convention. Only load trusted artifacts; joblib/pickle artifacts can execute code during loading and must not be accepted from untrusted sources.

Do not commit large raw datasets or generated model binaries by default. Document where artifacts are stored and how to reproduce them.

### 10.2 Python inference contract

Expose a small Python API independent of CLI and frontend code. Conceptually:

```python
prediction = predict_window(pose_window, artifact_path=MODEL_PATH)

# Example shape; actual names should be finalized in implementation.
{
    "label": "fall",
    "fall_score": 0.87,
    "is_valid": True,
    "model_version": "fall-baseline-1",
    "window": {
        "start_ms": 1000,
        "end_ms": 3500
    }
}
```

The example score is illustrative only, not a measured result.

The inference function should:
- Accept a validated pose window or the stable feature representation derived from it.
- Apply exactly the same preprocessing and feature ordering used in training.
- Reject malformed, too-short, or low-quality windows with a structured reason.
- Return the fall score and model/version metadata.
- Avoid raising a false `normal` result when input quality is insufficient; distinguish invalid/uncertain input from a valid normal prediction.
- Contain no alerting, persistence, HTTP, or UI behavior in Milestone C.

Also provide a small CLI for smoke testing if useful, but keep stdout/stderr behavior documented and machine-readable.

### 10.3 Browser/backend deployment decision

Milestone C should not be blocked by the eventual deployment choice. First produce a working Python inference module.

For Milestone D, compare:
- A Python inference service that loads the scikit-learn artifact and accepts numeric pose windows.
- Export to a browser/backend-compatible runtime format, only if the selected model and preprocessing can be exported faithfully.

Do not send raw camera video to a server. If a backend inference path is selected, transmit only the minimum numeric pose/features over authenticated transport and document retention/access controls.

**Deliverables**
- Versioned model artifact.
- Artifact metadata.
- Python inference API and tests.
- Reproducible load-and-predict smoke test.
- Short deployment-format recommendation for Milestone D.

---

## 6. Proposed commands and developer workflow

Exact command names can be finalized during implementation. A target workflow could look like:

```bash
cd ml/fall-detection

python -m venv .venv
# Activate the environment for your operating system.
pip install -r requirements.txt

# Validate raw sequence files and the manifest.
python scripts/validate_dataset.py --config configs/baseline.yaml

# Preprocess, resample, and generate labelled windows.
python scripts/prepare_dataset.py --config configs/baseline.yaml

# Train candidate baselines using the recorded grouped split.
python scripts/train.py --config configs/baseline.yaml

# Evaluate the selected model on the held-out test split.
python scripts/evaluate.py --config configs/baseline.yaml

# Run tests.
pytest
```

These are proposed commands, not existing repository scripts.

The workflow should be deterministic when given the same raw dataset, manifest, config, and software versions. Generated outputs should include a run ID and configuration snapshot.

---

## 7. Testing strategy

### Unit tests
- Schema parsing and unsupported versions.
- Landmark count/order and coordinate validation.
- Missing/invalid landmark handling.
- Timestamp ordering and duplicate timestamps.
- Resampling and maximum-gap behavior.
- Coordinate normalization.
- Window boundaries, stride, and labels.
- Feature extraction and derivatives.
- Group-aware split leakage checks.
- Training pipeline fit/transform behavior.
- Artifact save/load.
- Inference result shape and invalid-window behavior.

### Integration tests
- Run the full pipeline on a tiny synthetic dataset with known labels.
- Validate the same dataset twice and compare reports.
- Generate windows and prove groups remain isolated.
- Train a baseline and load the saved artifact in a fresh process.
- Run inference on a valid window.
- Run inference on missing/low-quality data and confirm it returns invalid/uncertain rather than silently `normal`.

### Manual/research checks
- Inspect a sample of fall and normal sequences visually or through plots of extracted features.
- Inspect hard negatives.
- Review false positives and false negatives by source sequence.
- Verify no raw video is required or included in ML inputs.
- Confirm all reported metrics are from the intended split.

---

## 8. Privacy, consent, and safety

- Use public datasets only under their applicable licenses and permissions.
- Obtain informed consent for project-collected recordings and derived pose data.
- Avoid collecting identifiable metadata.
- Treat pose sequences as sensitive data even without raw video.
- Keep raw/interim/processed data out of version control unless explicitly approved.
- Define access, storage, retention, and deletion practices for collected sequences.
- Do not ask vulnerable participants to stage dangerous falls.
- Do not claim clinical validation.
- Do not rely on the classifier as the sole emergency response mechanism.
- Keep alerting and human confirmation outside Milestone C.

---

## 9. Milestone C implementation order and checkpoints

| Step | Work item | Exit condition |
|---|---|---|
| C0 | Audit actual Milestone B export and schema | Input contract and missing-data policy documented |
| C1 | Create isolated Python module | Environment, structure, and tests run |
| C2 | Source and annotate dataset | Provenance, labels, subjects/sessions and manifest available |
| C3 | Build ingestion/validation | Invalid files and schema mismatches are reported |
| C4 | Preprocess/resample | Reproducible fixed-cadence sequences with explicit masks |
| C5 | Generate windows | Labelled windows and manifest are reproducible |
| C6 | Extract features | Stable, tested feature matrix and feature documentation |
| C7 | Create grouped splits | No sequence/subject/session leakage |
| C8 | Train baselines | Reproducible baseline comparison and saved pipeline |
| C9 | Evaluate | Test metrics, error analysis and validation threshold documented |
| C10 | Export inference artifact | Python API loads artifact and passes smoke tests |

### Final Milestone C acceptance criteria

- [ ] `ml/fall-detection/` is independent of `ml/intent-classifier/`.
- [ ] Input loader reads the current Milestone B JSON schema or explicitly supports a versioned migration.
- [ ] Dataset manifest records labels, provenance, subject/session grouping, and event intervals where available.
- [ ] Data-quality validation reports malformed files, invalid frames, missing landmarks, and cadence problems.
- [ ] Preprocessing is deterministic and does not overwrite raw exports.
- [ ] Window generation is timestamp-aware and has tested label-boundary rules.
- [ ] Feature extraction is documented, ordered, and unit-tested.
- [ ] Train/validation/test splits are subject-independent where possible and never split overlapping windows from one sequence across splits.
- [ ] At least Logistic Regression and Random Forest baselines are compared when dataset size permits.
- [ ] Evaluation reports fall recall, precision, specificity, F1, confusion matrix, false-alarm behavior, and latency where measurable.
- [ ] Threshold selection uses validation data, not test data.
- [ ] The fitted preprocessing and model are saved together with metadata.
- [ ] A Python inference API accepts a pose window and distinguishes invalid/uncertain input from normal activity.
- [ ] A fresh-process artifact load and inference smoke test passes.
- [ ] No caregiver alert, backend event persistence, or clinical claim is introduced in C.

---

## 10. Milestone D preview — how C connects to the product

Milestone D should consume the Python inference contract rather than duplicate feature extraction in TypeScript.

A likely integration sequence is:

1. Decide whether inference runs in a Python service or an exported compatible runtime.
2. Adapt the existing rolling pose stream to form windows matching the model's cadence, duration, landmark mapping, and quality policy.
3. Ensure online preprocessing is identical to training preprocessing.
4. Run inference repeatedly over a rolling window.
5. Add a separate temporal confirmation layer; one positive window must not automatically trigger an emergency alert.
6. Represent low-quality input and model uncertainty explicitly.
7. Add backend event persistence and caregiver acknowledgement/alert workflows.
8. Add end-to-end monitoring, auditability, and operational safeguards.

The exact transport, endpoint, database schema, and alert design belong to Milestone D and should be designed against the repository's existing backend conventions at that time.

---

# 11. Codex implementation prompt — Milestone C

Use this prompt after reviewing and approving the plan. Codex should have access to the repository branch.

```text
Implement Milestone C (dataset preparation, training, evaluation, and inference artifact) for the Elderly application's fall-detection feature.

REPOSITORY CONTEXT
- Existing frontend fall-detection feature: fe/src/features/fall-detection/
- Existing pose sequence contract: fe/src/features/fall-detection/types/pose-sequence.types.ts
- Existing serializer: fe/src/features/fall-detection/utils/poseSerializer.ts
- Existing rolling buffer: fe/src/features/fall-detection/utils/poseSequenceBuffer.ts
- Existing export utility: fe/src/features/fall-detection/utils/poseExporter.ts
- Existing feature documentation: fe/src/features/fall-detection/README.md
- Existing Python ML module: ml/intent-classifier/ (unrelated NLP classifier; do not modify it)
- Current pose sequence schema: 1.0.0
- Current pose representation: 33 MediaPipe landmarks per frame with timestamps, coordinates, visibility/presence and quality metadata.

GOAL
Create an independent Python ML module under ml/fall-detection/ that can ingest labelled Milestone B pose-sequence JSON files, validate and preprocess them, generate temporal windows, extract interpretable features, train/evaluate baseline classifiers, save a reproducible model artifact, and expose a Python inference function.

FIRST: INSPECT, DO NOT ASSUME
1. Inspect the actual branch and the complete Milestone B implementation.
2. Verify the real JSON export shape and coordinate/timestamp semantics.
3. Inspect serializer behavior for invalid/missing coordinates. In particular, do not assume a coordinate equal to zero is missing or valid without considering the schema/quality information.
4. Inspect existing Python conventions and root .gitignore.
5. Inspect available dataset files. Do not invent labels, subjects, sample counts, event boundaries, or performance.
6. If no labelled fall dataset is present, build the pipeline and synthetic test fixtures, but do not fabricate a real training result. Clearly document that a real dataset is still required.

SCOPE
- Work only in ml/fall-detection/ and relevant root ignore/docs files if necessary.
- Do not modify ml/intent-classifier/.
- Do not reimplement or change the browser camera/MediaPipe pipeline.
- Do not upload or require raw video.
- Do not implement backend APIs, caregiver alerts, event persistence, or frontend fall predictions.
- Do not claim clinical validation.

DATA CONTRACT
- Support the current PoseSequence schema version 1.0.0.
- Validate 33 landmarks and the documented ordering.
- Preserve timestamps and confidence/quality information.
- Handle optional z, visibility, and presence.
- Reject unsupported schema versions.
- Never silently turn missing coordinates into valid zeros.
- If schema changes are required, document a versioned migration rather than silently breaking existing exports.

DATASET
- Use a manifest with sequence path, label, source, pseudonymous subject/session IDs, and event interval where available.
- Labels initially: fall and normal.
- Include hard negatives such as sitting, quick sitting, bending, kneeling, reaching, walking/turning, and intentional lying down.
- Do not invent dataset contents. Document source, license, provenance, and limitations.
- Do not ask elderly participants to perform dangerous staged falls.

PIPELINE
1. Implement schema parsing and dataset validation with actionable reports.
2. Implement timestamp-aware resampling to a configurable fixed cadence.
3. Preserve explicit masks/quality for missing or low-visibility landmarks.
4. Implement person-relative normalization as an experiment without removing useful global vertical displacement.
5. Generate timestamp-based fixed-duration windows; test 2.0, 2.5, and 3.0 second candidates if the data supports it.
6. Label windows from annotated event intervals using a documented rule; exclude ambiguous windows.
7. Extract interpretable spatial and temporal features, including torso geometry/angle, hip/torso vertical movement, timestamp-aware velocities, body aspect ratio, low-posture duration, and quality summaries.
8. Compare basic geometry features against geometry plus temporal and quality features.
9. Split by subject, or by recording session if subject IDs are unavailable. Never split windows from the same source sequence across splits.
10. Train LogisticRegression and RandomForest baselines; optionally compare HistGradientBoosting if justified.
11. Fit preprocessing only on training data. Handle imbalance only on training data.
12. Evaluate on held-out data and report confusion matrix, fall precision/recall, specificity, F1, balanced accuracy, and false alarm/detection latency metrics where the data permits.
13. Select any operating threshold on validation data only.
14. Save preprocessing + model together with feature order, class mapping, cadence/window settings, dataset/split references, package versions, and model version.
15. Expose a Python inference API that returns fall score/label and validity information. Invalid/low-quality windows must not be silently classified as normal.

TESTING
- Add unit tests for schema, malformed data, missing landmarks, timestamps, resampling, windows, event labels, feature extraction, group splits, artifact load/save, and inference.
- Add a tiny synthetic dataset strictly for automated tests, not as evidence of real-world performance.
- Add a full-pipeline smoke test.
- Ensure raw datasets, generated processed data, and large model binaries are not accidentally committed.

DOCUMENTATION
- Add ml/fall-detection/README.md with setup, data manifest format, commands, data provenance/licensing requirements, preprocessing, features, split strategy, evaluation, artifact format, inference API, and limitations.
- Document actual results only. If no real labelled data is available, say so explicitly and do not print fabricated metrics.
- Document the Milestone D integration boundary without implementing it.

Before finishing, report:
- Files created/changed.
- Dataset sources actually used and their licenses.
- Number of sequences, subjects, sessions, and windows actually processed.
- Preprocessing and feature configuration.
- Split strategy and leakage checks.
- Models trained and actual measured metrics.
- Artifact path/version and inference smoke-test result.
- Tests/build commands actually run and their outcomes.
```

---

## 12. Source files reviewed

The plan is grounded in the following branch files:

- `Elderly_Fall_Detection_Implementation_Plan.md`
- `Elderly_Fall_Detection_Milestone_A_Plan.md`
- `Elderly_Fall_Detection_Overview_and_Milestone_B_Plan.md`
- `fe/package.json`
- `fe/src/features/fall-detection/README.md`
- `fe/src/features/fall-detection/pages/FallDetectionDemoPage.tsx`
- `fe/src/features/fall-detection/hooks/useCamera.ts`
- `fe/src/features/fall-detection/hooks/usePoseLandmarker.ts`
- `fe/src/features/fall-detection/hooks/usePoseSequenceCapture.ts`
- `fe/src/features/fall-detection/types/pose-sequence.types.ts`
- `fe/src/features/fall-detection/utils/poseSerializer.ts`
- `fe/src/features/fall-detection/utils/poseSequenceBuffer.ts`
- `fe/src/features/fall-detection/utils/poseExporter.ts`
- `fe/src/features/fall-detection/__tests__/milestone-b.test.ts`
- `ml/intent-classifier/README.md`
- `ml/intent-classifier/train.py`
- `ml/intent-classifier/predict.py`
- `ml/intent-classifier/requirements.txt`

**Planning note:** This document is an implementation plan based on the branch contents inspected. It does not assert that Milestone C has been implemented, that a suitable labelled dataset is already available, or that any classifier performance has been measured.
