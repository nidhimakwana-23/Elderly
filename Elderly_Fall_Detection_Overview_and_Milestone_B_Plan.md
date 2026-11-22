# Elderly — Fall Detection System Overview & Milestone B Plan

## 1. Purpose

Build fall detection into the existing Elderly application incrementally. The system should use the pose-detection pipeline already demonstrated in Milestone A to produce consistent, timestamped pose sequences. Those sequences will form the input for a separately developed and evaluated fall-classification model.

**Current status:** Milestone A (live camera + pose visualization) is considered complete. This document focuses on the overall system design and implementation of **Milestone B: Pose Sequence Capture**.

> Repository-inspection note: The public GitHub repository could be identified, but its source files/directories could not be reliably retrieved through the available browser access in this session. The plan therefore avoids claiming specific existing component names, APIs, state-management choices, or code locations. Implementation should begin with a short repository audit and adapt this plan to the actual conventions in `fe/` and other relevant areas.

---

## 2. Overall idea

The application will evolve from displaying a skeleton to collecting a continuous stream of structured pose data, then using temporal patterns in that data to estimate whether a fall-like event may have occurred.

```text
Browser camera
   |
   v
Existing camera / video lifecycle (Milestone A)
   |
   v
Existing pose SDK (Milestone A)
   |
   v
Pose result per processed frame
   |
   v
[Milestone B] Normalize & serialize pose result
   |
   v
[Milestone B] Timestamped pose-frame stream
   |
   v
[Milestone B] Rolling sequence buffer + optional consented export
   |
   v
[Milestone C] Dataset preparation & temporal feature extraction
   |
   v
[Milestone C] Train / evaluate custom classifier
   |
   v
[Milestone D] Rolling inference + temporal confirmation
   |
   v
Backend event persistence / caregiver notification / event review
```

### System principles

- **No raw video upload:** The pose capture pipeline should not upload or persist camera footage as part of this milestone.
- **Separate capture from classification:** The pose pipeline produces data; fall classification is a downstream consumer.
- **Consistent representation:** All captured frames should have the same schema, landmark ordering, coordinate conventions, and quality indicators.
- **Temporal data is first-class:** Fall detection is based on movement over time, not a single pose.
- **Privacy by default:** In-memory capture only by default. Export is explicit, visible, and opt-in.
- **Graceful degradation:** Missing, occluded, or low-confidence landmarks must be represented rather than silently treated as valid.
- **Reproducibility:** Document SDK/model version and the data schema used for captured sequences.

---

## 3. Milestone boundaries

### Milestone A — Live pose capture (completed)

Milestone A demonstrated the foundational capture pipeline:

- Camera permission and stream lifecycle.
- Live video preview.
- Pose SDK initialization and frame inference.
- Skeleton / landmark visualization.
- Camera and pose status feedback.
- Camera cleanup when stopped or when leaving the page.

**Milestone A does not claim to detect falls.**

### Milestone B — Capture and record pose sequences (this milestone)

Turn pose results from the live pipeline into a usable data stream:

1. Define stable TypeScript types for landmarks, frames, and sequences.
2. Convert SDK results to the application-owned representation.
3. Attach timestamps and sequence metadata.
4. Maintain a bounded rolling buffer.
5. Make buffer status inspectable in the UI or development tools.
6. Provide optional local JSON export for data collection/debugging, subject to consent.
7. Validate quality edge cases and test the data pipeline.
8. Document schema and capture assumptions for future dataset work.

**Out of scope:** training, fall predictions, backend uploads, alerting, event persistence, and clinical claims.

### Milestone C — Model and dataset

- Collect or obtain ethically sourced, labelled pose sequences.
- Define fall and non-fall classes and event boundaries.
- Build sequence/window preparation and temporal features.
- Train baseline classifiers.
- Evaluate subject/session-independent splits.
- Export model and preprocessing artifacts.

### Milestone D — Product integration

- Run classifier on rolling windows.
- Add calibrated decision logic and temporal confirmation.
- Integrate event API and storage.
- Implement caregiver alerts, acknowledgement, and false-alarm handling.
- Add monitoring, operational controls, and end-to-end tests.

---

## 4. Milestone B architecture

Keep the new data processing path downstream of the existing pose SDK. Do not reimplement camera capture or pose detection.

```text
Existing camera video
       |
       v
Existing pose detector
       |
       v
Pose SDK result
       |
       v
Pose result adapter / serializer
       |
       +----> Quality / visibility checks
       |
       v
PoseFrame (timestamp + fixed landmark array)
       |
       v
Rolling PoseSequenceBuffer
       |
       +----> Buffer / capture status in UI
       |
       +----> Optional explicit JSON export
       |
       v
Future classifier interface (not implemented in B)
```

### Responsibilities

| Layer | Responsibility |
|---|---|
| Existing camera & pose layer | Own camera, detector, inference loop, and visualization. |
| Pose adapter | Translate SDK-specific result objects into app-owned types. |
| Frame validation | Check expected landmark count, values, and quality metadata. |
| Sequence buffer | Retain a bounded, ordered set of frames. |
| Capture controls/status | Start/stop sequence collection, show counts/duration/quality. |
| Export utility | Serialize a chosen captured sequence to JSON only on explicit user action. |
| Future classifier | Consume sequences/windows; outside Milestone B. |

The adapter should isolate SDK-specific naming and result shape. Downstream code should not need to import or understand SDK result classes.

---

## 5. Data contract

Define the representation based on the exact pose SDK/model already used in the repository. Confirm landmark order, fields, and coordinate semantics against the installed version/documentation before finalizing the schema.

### 5.1 Pose landmark

A landmark should preserve the numeric values provided by the SDK where available, plus explicitly represented quality fields.

Conceptual TypeScript shape:

```ts
export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}
```

The team should decide whether missing values are represented as omitted optional fields, explicit `null`, or another well-defined form. Do not substitute zero for a missing coordinate or confidence value.

### 5.2 Pose frame

```ts
export interface PoseFrame {
  timestampMs: number;
  frameIndex: number;
  landmarks: PoseLandmark[];
  quality?: {
    poseDetected: boolean;
    validLandmarkCount: number;
    expectedLandmarkCount: number;
  };
}
```

The `quality` object is illustrative and should be finalized according to what the SDK actually provides and what can be computed reliably. Avoid redundant or misleading fields.

### 5.3 Pose sequence

```ts
export interface PoseSequence {
  schemaVersion: string;
  captureId: string;
  startedAt: string;
  endedAt?: string;
  frames: PoseFrame[];
  metadata?: {
    poseSdk: string;
    poseModelVersion?: string;
    coordinateConvention?: string;
    notes?: string;
  };
}
```

The metadata must not contain identifiable personal information by default. Metadata values should reflect known facts, not guesses.

### 5.4 Contract invariants

- Every frame uses the same documented landmark ordering.
- Frames are stored in chronological order.
- Timestamps are monotonically increasing within the capture, or any discontinuities are handled explicitly.
- The schema is versioned.
- Coordinates are not silently transformed; normalization (if applied) is documented.
- Low-visibility/missing landmarks are preserved and marked, not fabricated.
- The buffer has a configured maximum capacity or duration.
- No raw image or video data is included in `PoseFrame` or `PoseSequence`.

---

## 6. Timestamping and frame cadence

Use timestamps tied to the source video/inference timeline where the SDK/API allows it, rather than relying on the time a React state update happens. Confirm the timestamp semantics of the existing implementation.

Requirements:

- Record a timestamp for each accepted pose frame.
- Keep a frame index for deterministic ordering/debugging.
- Handle duplicate timestamps or skipped frames deliberately.
- Do not assume inference runs at a fixed FPS.
- Track capture duration and actual frame cadence for diagnostics.
- If future training requires a uniform cadence, resampling should be done in dataset preparation or in a clearly defined preprocessing layer—not by silently altering the original captured stream.

For Milestone B, timestamps and observed cadence are sufficient. Resampling and window alignment can be addressed in Milestone C.

---

## 7. Rolling sequence buffer

### 7.1 Purpose

Retain recent pose frames without allowing memory use to grow indefinitely. This rolling buffer is a live data window—not a persistent database.

### 7.2 Requirements

- Configurable capacity (prefer a time-based retention option, a frame-count limit, or both).
- Append frames in order.
- Evict oldest frames when the configured bound is exceeded.
- Read a snapshot without mutating the buffer.
- Clear the buffer.
- Reset on a new capture session if session semantics require it.
- Expose simple stats: frame count, retained duration, oldest/newest timestamp, dropped/invalid frame count if tracked.
- Avoid coupling buffer mutation to React rendering.
- Avoid storing duplicate frame objects unnecessarily.

### 7.3 Initial configuration

Choose an initial buffer duration based on usability and resource testing, rather than treating a number as a model requirement. Make the limit configurable and document the chosen value.

The buffer should be long enough to inspect movement sequences and eventually support window-based experimentation, but Milestone B should not make assumptions about the final classifier window.

---

## 8. Capture session behavior

Milestone B should introduce a clearly defined capture session distinct from simply having the camera active.

Suggested behavior:

1. User opens the existing pose demo.
2. User starts camera (existing Milestone A control).
3. Pose detection begins as it currently does.
4. User explicitly starts sequence capture, or sequence capture is clearly tied to the demo's existing active state if that is the selected UX.
5. Accepted pose frames are serialized and appended to the rolling buffer.
6. Capture status updates show duration, frame count, and quality indicators.
7. User stops capture; the sequence is frozen for inspection/export until cleared or a new session begins.
8. User may explicitly export the captured sequence as JSON.
9. User clears the sequence when finished.
10. Stopping the camera must stop pose inference and sequence capture and perform existing resource cleanup.

Clarify whether capture starts automatically with the camera or requires a separate button. A separate capture control makes consent and the distinction between live visualization and recording of derived pose data clearer.

### UI/status ideas (not a mandatory redesign)

- Camera: active / inactive.
- Pose model: loaded / loading / error.
- Pose: detected / not detected.
- Sequence capture: recording / stopped.
- Frame count and retained duration.
- Frames rejected or incomplete (if tracked).
- Buffer capacity status.
- Export button enabled only when data exists.
- Clear sequence control.
- Explicit indication that only pose landmarks are captured—not video.

Avoid updating React state on every landmark or every inference frame if it harms performance. Use refs or the repository's appropriate data-store pattern and throttle display-only metrics.

---

## 9. Serialization and export

### 9.1 Serializer

Implement a small, testable adapter that:

- Receives the SDK result for a frame.
- Extracts the selected pose (single-person scope initially, unless the current implementation already supports another policy).
- Maps landmarks into the documented application-owned ordering.
- Copies numeric values and available visibility/presence fields.
- Attaches timestamp and frame index.
- Produces an explicit missing-pose result or skips the frame according to a documented policy; do not invent landmark values.
- Validates malformed/non-finite values.

### 9.2 Export

Optional export should be a developer/data-collection utility, not a hidden automatic persistence feature.

- Export JSON only after an explicit action.
- Export a sequence snapshot, not a mutable reference to the live buffer.
- Include schema version and capture metadata.
- Never include raw video or image frames.
- Avoid names, email, patient identifiers, or other personal details in file metadata.
- Make it clear that pose sequences may still be sensitive movement data.
- Export is disabled or handled gracefully if the buffer is empty.
- No server upload or automatic persistence in Milestone B.

Example filename (non-identifying): `pose-sequence-<capture-id>.json`.

---

## 10. Landmark and capture quality handling

### 10.1 Missing pose

If no pose is detected:

- Do not create a fabricated full-body pose.
- Decide whether to omit the frame from the sequence or store a separate no-pose sample/event. For the initial milestone, omission from pose-frame data with a counter/status is a simple default.
- Ensure gaps in timestamps remain observable.
- Keep the UI state accurate.

### 10.2 Low-visibility landmarks

- Preserve visibility/presence values when available.
- Avoid replacing low-confidence coordinates with arbitrary positions.
- Do not discard a whole frame solely because one landmark is weak unless a clearly documented frame-validity policy requires it.
- Report frame quality using a simple, documented metric.
- Leave model-specific thresholds configurable and avoid claiming that a threshold is validated for fall detection.

### 10.3 Multiple people

The intended first prototype is single-person fall monitoring. Confirm the SDK's person/pose selection behavior.

- Use a documented selection policy (e.g. first pose, if this is the current SDK behavior and product scope).
- Do not silently mix landmarks from different people across consecutive frames.
- If identity tracking is not available, document the limitation: a selected pose may switch between people.
- Test with multiple people and define expected behavior for the demo.

### 10.4 Partial body / occlusion

- Capture available landmarks and quality indicators.
- Do not assume a full body is visible.
- Test head/feet off-screen, person seated, foreground occlusion, and lighting changes.
- Avoid interpreting poor visibility as evidence of a fall.

### 10.5 Camera motion

Milestone B should record pose data as provided and document camera placement assumptions. It should not implement camera-motion compensation unless required and scoped separately.

---

## 11. Testing strategy

### 11.1 Unit tests

- SDK result -> PoseFrame serialization.
- Landmark mapping/order.
- Optional fields and missing values.
- Invalid/non-finite numeric values.
- No pose result handling.
- Timestamp/frame-index handling.
- Rolling buffer append.
- Capacity/duration eviction.
- Snapshot immutability/behavior.
- Clear/reset.
- Sequence export format and metadata.

### 11.2 Integration/manual tests

- Camera active and inference running: sequence frames accumulate.
- Stop capture: sequence count no longer changes.
- Restart capture: session behavior is consistent.
- Stop camera: inference and capture stop; camera resources are released.
- Navigation away/unmount: no continuing capture.
- Empty sequence: export unavailable or handled gracefully.
- JSON export can be parsed and conforms to schema.
- Repeated start/stop does not accumulate stale data.
- Test different frame rates and dropped frames.
- No pose, one pose, multiple people, partial-body view, occlusion, low light, and camera movement.

### 11.3 Performance checks

- Inspect CPU/GPU usage and responsiveness during capture.
- Verify bounded memory growth over extended sessions.
- Measure actual capture cadence and buffer size.
- Confirm serialization does not materially degrade overlay/inference performance.
- Avoid unnecessary copying or React renders per inference frame.

---

## 12. Privacy and safety requirements

- Camera permission is required for live capture.
- Sequence capture should have a visible indication and clear user control.
- Do not record video in this milestone.
- Do not upload pose data.
- Do not persist pose sequences by default.
- Local JSON export is explicit and consent-aware.
- Explain that pose data can be sensitive even without video.
- Avoid storing identifiable metadata.
- Do not represent the system as a validated fall detector or sole emergency response mechanism.

---

## 13. Proposed implementation steps

### Step 0 — Repository reconnaissance

Before modifying code:

- Inspect frontend framework, routes, component conventions, package scripts, and existing Milestone A implementation.
- Find where inference results are exposed and whether results are accessible without coupling to drawing.
- Determine the existing SDK/model version and landmark structure.
- Inspect existing tests and build/lint commands.
- Identify the cleanest point to add a serializer and buffer.
- Preserve current camera, detector, and drawing behavior; do not restructure unrelated code.

**Deliverable:** A short implementation mapping of this plan to existing code/files.

### Step 1 — Define types and schema

- Create app-owned landmark, frame, and sequence types.
- Confirm and document landmark order.
- Define coordinate conventions and optional confidence fields.
- Version the schema.

**Deliverable:** Type definitions and concise schema documentation.

### Step 2 — Implement the pose result adapter

- Convert one SDK result into a PoseFrame.
- Validate field values and landmark counts.
- Define no-pose behavior.
- Keep the adapter independent of React/UI.

**Deliverable:** A deterministic serializer with unit tests.

### Step 3 — Implement rolling buffer

- Add bounded in-memory buffer.
- Support append, snapshot, clear, and stats.
- Implement eviction.
- Ensure capture-session reset behavior is explicit.

**Deliverable:** Buffer module with tests.

### Step 4 — Connect capture to existing inference

- Feed accepted inference results into the adapter.
- Append frames to the buffer while sequence capture is active.
- Avoid modifying the camera/inference lifecycle unnecessarily.
- Keep inference and UI rendering responsive.

**Deliverable:** Live pose frames flowing into the buffer.

### Step 5 — Add capture status and controls

- Add explicit sequence-capture control if appropriate.
- Display capture status, frame count, retained duration, and quality summary.
- Provide clear and stop controls.
- Keep camera and capture state distinct where needed.

**Deliverable:** Usable sequence-capture UI.

### Step 6 — Add optional JSON export

- Export a snapshot of the buffer.
- Include schema version and non-identifying metadata.
- Ensure no video/image data is exported.
- Add clear user-facing messaging about the sensitivity of pose data.

**Deliverable:** Explicit local JSON export.

### Step 7 — Test, validate, and document

- Run unit tests and project build/lint checks.
- Test manual scenarios in Section 11.
- Confirm bounded memory behavior.
- Document data schema, SDK/model details, known limitations, and how to export a sequence.

**Deliverable:** Milestone B demonstration and implementation notes.

---

## 14. Milestone B acceptance criteria

Milestone B is complete when:

- [ ] The existing Milestone A demo remains functional.
- [ ] Pose results can be converted into an application-owned frame representation.
- [ ] The landmark order and coordinate assumptions are documented.
- [ ] Frames have timestamps and deterministic ordering.
- [ ] Missing/low-quality pose data is handled explicitly.
- [ ] A bounded rolling sequence buffer works and does not grow indefinitely.
- [ ] Capture can be stopped and cleared predictably.
- [ ] UI status reflects frame count and capture state.
- [ ] Optional JSON export is explicit, local, and contains no video.
- [ ] Serialization and buffer tests pass.
- [ ] Start/stop, unmount, occlusion, multiple people, and partial visibility are tested.
- [ ] Build and relevant checks pass.
- [ ] No fall classifier, fall alarm, backend upload, or fall claim is introduced.

---

## 15. How Milestone B unlocks Milestone C

Milestone B provides the stable raw derived-data contract. Milestone C can then operate on saved pose sequences instead of being entangled with webcam, React, or SDK code.

```text
Milestone B output:
PoseSequence JSON
   |
   v
Dataset labeling / event boundaries (Milestone C)
   |
   v
Windowing + resampling (if needed)
   |
   v
Feature extraction
   |
   v
Train / validation / test split by subject/session
   |
   v
Baseline model + evaluation
```

Milestone B should preserve enough information for Milestone C to experiment with different window lengths, normalization, and feature extraction without recapturing or rewriting the frontend capture pipeline.
