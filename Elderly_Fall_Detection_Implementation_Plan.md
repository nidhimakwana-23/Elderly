# Elderly Care Fall Detection — Pose Capture and ML Implementation Plan

## 1. Goal

Add a fall-detection feature to the Elderly web application.

The proposed pipeline is:

```text
Webcam video in the browser
        |
        v
Google MediaPipe Pose Landmarker (browser-side)
        |
        v
Pose landmarks over time
        |
        v
Feature extraction / temporal window
        |
        v
Custom trained fall-detection model
        |
        v
Prediction: fall / no-fall (or uncertain)
        |
        v
Backend event + alert workflow (later phase)
```

**Important terminology:** For a browser-based website, use **MediaPipe Pose Landmarker for Web** (from `@mediapipe/tasks-vision`) unless the project has a specific reason to use another Google product. Google's ML Kit Pose Detection is primarily a mobile SDK; it is not the same thing as the browser MediaPipe Tasks API. Confirm the selected SDK and version before implementation.

The first deliverable is deliberately smaller:

> A dedicated website screen that opens the camera, displays the live video, runs pose detection, and draws the detected skeleton/landmarks over the video.

The end-to-end fall classifier can be developed after pose capture is demonstrable.

---

## 2. Separate the work into milestones

### Milestone A — Live pose-capture demo (first priority)

Build a standalone frontend screen that:

1. Requests camera permission.
2. Displays the live camera stream.
3. Loads the pose detection model.
4. Runs pose detection repeatedly on video frames.
5. Draws pose landmarks and connections over the camera feed.
6. Displays basic status: camera state, pose detected/not detected, and inference state.
7. Supports stopping the camera and releasing the media tracks.

**Do not train or integrate the fall classifier in this milestone.**

This milestone is enough to demonstrate that the camera and pose-capture portion works.

### Milestone B — Capture and record pose sequences

Once the live demo is stable:

1. Convert each pose result into a consistent numeric representation.
2. Add timestamps.
3. Store a rolling sequence of pose frames in memory.
4. Optionally record sequences to files for dataset creation, with clear consent and privacy controls.
5. Validate missing landmarks, multiple people, camera movement, and partial-body visibility.

### Milestone C — Train the custom fall-detection model

1. Build labelled sequences of normal activities and falls.
2. Extract temporal features from pose landmarks.
3. Train and evaluate a sequence classifier.
4. Export the trained model in a format usable by the browser or backend.
5. Run inference over rolling windows of pose data.

### Milestone D — Integrate fall events into the application

Only after the model has been tested:

1. Add fall-event API and persistence.
2. Add confidence/uncertainty handling and temporal confirmation.
3. Add caregiver alert workflow.
4. Add event history and acknowledgement.
5. Add operational safeguards and monitoring.

---

## 3. Browser pose-capture architecture

Recommended browser-side architecture:

```text
React page / component
       |
       +---- <video> element (camera)
       |
       +---- MediaPipe Pose Landmarker
       |
       +---- requestAnimationFrame loop
       |
       +---- canvas overlay
                  |
                  v
          Pose landmarks + connections
```

Use browser-side inference for the demo. The video should remain in the browser and should not be uploaded to the backend just to draw the skeleton.

### Suggested frontend components

Adapt these names to the existing frontend structure:

```text
fe/src/
└── features/
    └── fall-detection/
        ├── pages/
        │   └── FallDetectionDemoPage.tsx
        ├── components/
        │   ├── CameraPreview.tsx
        │   ├── PoseOverlay.tsx
        │   └── PoseStatusPanel.tsx
        ├── hooks/
        │   ├── useCamera.ts
        │   └── usePoseLandmarker.ts
        ├── utils/
        │   ├── poseDrawing.ts
        │   └── poseSerialization.ts
        └── types/
            └── pose.types.ts
```

Do not create every file if the existing frontend is organized differently. Follow the current React routing, component, styling, and TypeScript conventions.

---

## 4. Camera capture

Use `navigator.mediaDevices.getUserMedia()` to request a camera stream.

Requirements:

- Request video only; microphone access is not required for this demo.
- Prefer a configurable resolution such as 640×480 initially.
- Use the front or rear camera according to the product/demo environment.
- Attach the returned `MediaStream` to the video element.
- Wait for video metadata and playback before starting pose inference.
- Handle permission denied, no camera, camera already in use, and unsupported browser cases.
- Provide Start Camera and Stop Camera controls.
- On Stop, component unmount, or route change, stop every media track and clear the video source.
- Do not leave the camera running in the background.

Example concept:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 }
  },
  audio: false
});

videoElement.srcObject = stream;
await videoElement.play();
```

`getUserMedia` generally requires a secure context (HTTPS or localhost) and explicit user permission.

---

## 5. Pose Landmarker setup

For a website, use MediaPipe Tasks Vision Pose Landmarker, subject to checking the current official setup instructions and package version.

Typical package:

```bash
npm install @mediapipe/tasks-vision
```

The exact API and model asset URL must be taken from the current official documentation at implementation time. Do not invent or hard-code an unverified model URL.

Implementation responsibilities:

1. Load the WASM files and pose model asset.
2. Create the Pose Landmarker in `VIDEO` running mode.
3. Choose the appropriate delegate (GPU if supported and stable; otherwise CPU).
4. Set the maximum number of poses to detect. For a single-elder monitoring demo, start with one person.
5. Handle model loading failures and display a useful UI state.
6. Avoid recreating the detector on every React render.
7. Dispose/close the detector when the page is unmounted.

Conceptual configuration (confirm exact property names against the installed SDK version):

```ts
const poseLandmarker = await PoseLandmarker.createFromOptions(
  vision,
  {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1
  }
);
```

Keep the model asset in a controlled public/static asset location or use a documented official hosted asset. For a reproducible demo, pin the package version and document the model asset version.

---

## 6. Real-time inference loop

Run pose detection on video frames, not on arbitrary React render cycles.

Use `requestAnimationFrame` or a throttled video-frame loop. Ensure that:

- A frame is processed only when the video has current image data.
- A timestamp is supplied to the video inference API as required by the SDK.
- The same frame is not processed repeatedly.
- Inference does not create overlapping asynchronous calls.
- UI state updates are throttled; do not call React state setters for every landmark on every frame.
- The loop stops when the camera stops or the page unmounts.

Conceptual flow:

```ts
function processFrame() {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    animationFrameId = requestAnimationFrame(processFrame);
    return;
  }

  const timestamp = performance.now();
  const result = poseLandmarker.detectForVideo(video, timestamp);

  drawPose(result, video, canvas);

  animationFrameId = requestAnimationFrame(processFrame);
}
```

Check the exact synchronous/asynchronous inference API for the selected SDK version.

---

## 7. Drawing the pose overlay

Display the camera video and a transparent canvas aligned exactly on top of it.

The canvas should:

- Match the displayed video dimensions and aspect ratio.
- Account for CSS scaling and `object-fit`.
- Clear the previous frame before drawing.
- Draw landmark points and skeleton connections.
- Use the SDK's documented landmark connection definitions or a verified connection list.
- Handle mirrored/selfie preview correctly.
- Avoid drawing stale landmarks when no pose is detected.

Suggested screen layout:

```text
+--------------------------------------------------+
| Fall Detection — Pose Capture Demo               |
|                                                  |
|  Camera: Active       Pose: Detected             |
|                                                  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  |            LIVE CAMERA VIDEO               |  |
|  |                                            |  |
|  |          Pose skeleton overlay             |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  [Start Camera] [Stop Camera]                    |
|  FPS: --      Inference: Running                 |
+--------------------------------------------------+
```

The first demo should show:

- Live camera feed.
- Skeleton/landmark overlay.
- Camera permission/error state.
- Pose detected / not detected.
- Start/stop controls.

Do not show “Fall detected” until an actual validated classifier is integrated.

---

## 8. Pose data representation

For the custom classifier, use landmark coordinates and confidence/visibility values over time.

A pose frame can be represented conceptually as:

```json
{
  "timestampMs": 123456789,
  "landmarks": [
    {
      "x": 0.52,
      "y": 0.31,
      "z": -0.04,
      "visibility": 0.98
    }
  ]
}
```

Use the landmark ordering and names defined by the selected MediaPipe model. Do not assume an ordering from memory; document the exact mapping.

Important preprocessing:

- Normalize coordinates relative to the person, not just raw pixels, where appropriate.
- Consider body scale and camera distance.
- Handle low-visibility or missing landmarks.
- Keep a consistent frame rate or resample sequences.
- Include timestamps so velocity and movement features can be calculated.
- Do not treat a single pose frame as enough to identify a fall.

A fall is a temporal event. The classifier should use a sequence of frames before and after the suspected event.

---

## 9. Dataset design for fall detection

The model needs labelled **sequences**, not just isolated images.

Include both:

### Positive class: fall events

Examples may include:

- Forward fall.
- Backward fall.
- Sideways fall.
- Fall from standing.
- Fall while walking.
- Fall from a chair, if in scope.

### Negative class: normal activities and difficult non-fall movements

Examples:

- Standing up and sitting down.
- Sitting down quickly.
- Lying down intentionally.
- Bending to pick something up.
- Kneeling.
- Reaching down.
- Walking and turning.
- Getting into or out of bed.
- Normal walking with partial occlusion.

The negative examples are important because lying down or bending should not automatically trigger a fall alarm.

Use an appropriate public fall-detection dataset or ethically collected, consented data. Check dataset licenses, subject permissions, and whether the camera viewpoint resembles the intended deployment. Avoid asking elderly participants to perform dangerous falls. Use staged falls performed by consenting, physically capable adults or suitable public datasets.

Split data by person/recording session where possible. Do not randomly split adjacent frames from the same video between train and test, because that causes severe data leakage and inflated scores.

---

## 10. Feature extraction

Start with interpretable features derived from pose landmarks.

Possible per-frame features:

- Shoulder, hip, knee, and ankle positions.
- Torso angle relative to vertical.
- Hip centre and shoulder centre.
- Bounding box height and width.
- Approximate body orientation.
- Landmark visibility/quality.
- Distance between selected joints.

Temporal features across a window:

- Change in torso angle.
- Change in hip centre height.
- Vertical velocity of the torso/hip centre.
- Change in body bounding-box aspect ratio.
- Speed of movement.
- Whether the person remains close to the floor after a rapid downward movement.
- Duration of a low/lying posture.

Normalize coordinates to reduce sensitivity to camera resolution and distance. Evaluate whether camera movement or a person moving toward/away from the camera creates false signals.

Do not use all features blindly. Compare a simple feature set against a more complex one.

---

## 11. First custom model recommendation

For a manageable research prototype, begin with a classical model over engineered temporal features:

- Random Forest, or
- Gradient Boosting / HistGradientBoosting, or
- Logistic Regression as a simple baseline.

The training examples should be temporal windows, each labelled `fall` or `normal`.

Example:

```text
Window of pose frames (e.g. a few seconds)
             |
             v
Temporal feature extraction
             |
             v
Feature vector
             |
             v
Classifier
             |
             v
fall / normal
```

Do not select the window length arbitrarily. Experiment with a few window sizes and evaluate latency versus accuracy.

A later extension could use an LSTM or 1D CNN over landmark sequences, but do not start there unless the research scope and dataset justify it.

The model should return a probability/score, but do not assume it is calibrated. Choose an operating threshold on validation data with particular attention to false negatives and false alarms.

---

## 12. Real-time fall decision logic

Do not trigger an alarm based on one model prediction.

Use a temporal confirmation layer:

1. Maintain a rolling window of recent pose features.
2. Run the classifier on the window.
3. Require an appropriate sequence of high-risk predictions or a validated event rule.
4. Mark the event as suspected fall.
5. Show an on-screen confirmation state or follow the application's approved alert workflow.
6. Allow cancellation/false-alarm reporting if appropriate.

The confirmation logic must be tuned on validation data. A fall detector is safety-related: false negatives can miss an emergency and false positives can cause alarm fatigue.

For a prototype, display `Potential fall pattern` rather than claiming a confirmed fall. The system must not be presented as a clinically validated or sole emergency-monitoring device.

---

## 13. Browser inference versus backend inference

For the pose demo, keep camera capture and pose detection in the browser.

For the custom classifier, choose one of these after benchmarking:

### Option A — Browser-side classifier

- Export the trained model to a browser-compatible format (for example, ONNX if the chosen model/export path supports it).
- Run inference locally.
- Keep raw video and pose data on-device.
- Lower server bandwidth and better privacy.
- Requires frontend model loading and compatibility testing.

### Option B — Backend classifier

- Send only numeric pose sequences/features to the backend, not raw video.
- Backend loads the trained model and predicts.
- Easier to centralize model updates and logging.
- Requires authentication, secure transport, rate limits, and careful handling of sensitive movement data.

For the first demo, do not make this decision block pose capture. Keep the interface between pose extraction and classification as a clean function that accepts a numeric pose window.

---

## 14. Testing and evaluation

### Pose capture demo

Test:

- Camera permission granted/denied.
- Camera unavailable or busy.
- Start/stop repeatedly.
- Route changes/unmount cleanup.
- Different screen sizes and aspect ratios.
- Low light and partial body visibility.
- No person / one person / more than one person.
- Mirrored preview and overlay alignment.
- CPU/GPU performance and frame rate.
- Browser compatibility.

### Fall classifier

Use subject-independent or session-independent train/validation/test splits where possible.

Report:

- Confusion matrix.
- Precision.
- Recall/sensitivity for falls.
- Specificity.
- F1-score.
- False alarms per hour or per monitoring session.
- Detection latency from event start.
- Performance under occlusion, poor lighting, and different camera placements.

Accuracy alone is not sufficient for a fall-detection system because the normal class may greatly outnumber falls.

---

## 15. Privacy, consent, and safety

- Ask for explicit camera permission.
- Clearly indicate when the camera is active.
- Provide an obvious stop control.
- Stop camera tracks on unmount and when monitoring ends.
- Do not record or upload video by default.
- If recording is needed for dataset collection, obtain informed consent and define retention/access rules.
- Prefer processing locally and transmitting only the minimum necessary derived data.
- Secure any stored pose sequences as sensitive personal data.
- Do not claim the prototype can reliably detect all falls.
- Do not rely on it as the only emergency response mechanism.
- Include a human confirmation/escalation workflow before real-world deployment.

---

## 16. Recommended implementation order

1. Inspect the existing frontend routing and component conventions.
2. Add a dedicated Fall Detection / Pose Demo page.
3. Implement camera permission and video preview.
4. Integrate MediaPipe Pose Landmarker for Web.
5. Draw landmarks and skeleton connections over the video.
6. Add status, errors, and start/stop controls.
7. Verify camera cleanup on navigation/unmount.
8. Demonstrate this pose-capture screen.
9. Add a pose-frame data structure and rolling sequence buffer.
10. Build/obtain a labelled sequence dataset.
11. Implement feature extraction and dataset preparation.
12. Train and evaluate a baseline classifier.
13. Export/deploy the classifier to browser or backend.
14. Add rolling-window inference and temporal confirmation.
15. Add backend fall-event persistence and alerting.
16. Run end-to-end testing and document limitations.

---

## 17. Codex prompt — Milestone A: pose capture demo only

Copy this into Codex after it has access to the repository:

```text
Implement Milestone A of a browser-based fall-detection prototype in the existing Elderly application.

GOAL:
Create a dedicated frontend page that displays the live webcam stream and overlays human pose landmarks/skeleton using Google's MediaPipe Pose Landmarker for Web.

IMPORTANT:
- First inspect the existing frontend framework, routing, component structure, styling system, and package manager.
- Follow existing conventions. Do not restructure unrelated frontend code.
- This task is ONLY the live camera + pose visualization demo.
- Do not implement fall classification or claim to detect falls.
- Do not add backend endpoints.
- Do not upload video frames to the backend.
- Do not add an LLM or any other AI service.

TECHNOLOGY:
Use the browser-compatible MediaPipe Tasks Vision package (`@mediapipe/tasks-vision`) and Pose Landmarker, after verifying the current API and model asset setup for the installed version. Do not invent a model asset URL or use an obsolete API.

IMPLEMENTATION:
1. Add a dedicated Fall Detection / Pose Capture Demo page and register it in the existing frontend router.
2. Add a Start Camera control that requests video permission using getUserMedia; audio is not needed.
3. Display the stream in a video element.
4. Load the MediaPipe Pose Landmarker once, using VIDEO running mode and one detected pose initially.
5. Run pose detection on video frames using the API appropriate for the installed package version.
6. Draw pose landmarks and skeleton connections on a transparent canvas aligned with the video.
7. Handle video/canvas sizing, aspect ratio, object-fit, and mirrored preview so the overlay aligns with the person.
8. Show camera state, model-loading state, and whether a pose is currently detected.
9. Add Stop Camera control.
10. Stop all MediaStream tracks, cancel animation/frame loops, clear the video source, and close/dispose the detector on stop and component unmount.
11. Handle permission denied, unavailable camera, model-load failure, and inference errors with clear UI messages.
12. Avoid React state updates on every landmark/frame; use refs and throttle UI status updates.
13. Keep video processing in the browser. Do not record or transmit frames.
14. Add concise setup notes describing any model assets and local HTTPS/localhost requirements.

ACCEPTANCE:
- The page loads in the existing application.
- User can start the camera and see live video.
- Pose landmarks/skeleton appear over a visible person.
- User can stop the camera and the browser camera indicator turns off.
- Navigating away stops the camera and inference loop.
- Errors are handled gracefully.
- Existing application routes/features still work.

Before finishing, report files changed, package changes, model asset source/version, how to run the demo, and tests/build checks actually executed. Do not claim fall detection is implemented.
```

## 18. Codex prompt — Milestone B: pose sequence capture

Use this only after the live overlay works:

```text
Extend the existing pose-capture demo with a clean pose-sequence data interface.

Do not implement fall classification yet.

Requirements:
- Define TypeScript types for a pose frame, landmark, and timestamp.
- Convert each MediaPipe result into a stable numeric representation using the documented landmark ordering.
- Include x, y, z (where available), visibility/presence (where available), and timestamp.
- Maintain a configurable rolling buffer of recent frames in memory.
- Handle missing/low-visibility landmarks explicitly.
- Avoid storing raw video.
- Add a development-only way to inspect/export a pose sequence as JSON only if appropriate for the existing project.
- Do not persist personal pose data or upload it to the backend in this milestone.
- Add tests for serialization, missing landmarks, and buffer/window behavior.
- Document the landmark ordering and coordinate normalization assumptions.
```

## 19. Codex prompt — Milestone C: train the fall classifier

Use only after a suitable labelled sequence dataset exists:

```text
Implement a separate Python training/inference module for fall detection using pose landmark sequences.

First inspect the actual dataset and document its format. Do not invent dataset labels, sample counts, or performance results.

Initial approach:
- Convert labelled pose sequences into fixed-duration temporal windows.
- Extract interpretable spatial and temporal features from landmarks.
- Train a simple baseline classifier such as RandomForestClassifier.
- Compare against a LogisticRegression baseline if practical.
- Split train/validation/test by subject or recording session, not randomly by adjacent frames.
- Report confusion matrix, precision, fall recall/sensitivity, specificity, F1, and detection latency where the data permits.
- Save the fitted preprocessing and classifier artifacts.
- Add an inference function that accepts a numeric pose window and returns fall score/class.
- Handle missing landmarks and low-quality pose windows safely.
- Do not claim clinical validation.
- Do not implement alerting in this phase.

Document dataset source, license, class definitions, window length, feature definitions, split strategy, model settings, and actual measured results.
```

---

## 20. Final architecture

```text
                  EXISTING ELDERLY WEB APP
                            |
                            v
                  Fall Detection Demo Page
                            |
                +-----------+-----------+
                |                       |
                v                       v
           Webcam Video          Camera Status UI
                |
                v
        MediaPipe Pose Landmarker
                |
                v
        Pose Landmarks per Frame
                |
          +-----+------+
          |            |
          v            v
    Canvas Overlay   Pose Sequence Buffer
                       |
                       v
                Temporal Features
                       |
                       v
                Custom Fall Model
                       |
                       v
                Fall / Normal / Uncertain
                       |
                       v
             Confirmation + Alert Workflow
                       |
                       v
                 Existing Backend
```

**Recommended immediate scope:** implement Milestone A only. A working camera feed with correctly aligned pose landmarks is a strong standalone demo. Keep the pose output interface clean so the custom fall model can be added later without rewriting the camera or visualization code.
