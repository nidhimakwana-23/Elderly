# Fall Detection Feature — Milestone B: Pose Sequence Capture

This module implements **Milestone B (Pose Sequence Capture & Rolling Buffer)** for the Elderly application. It builds directly upon Milestone A (live camera and MediaPipe Pose visualization) to convert raw inference results into structured, timestamped, privacy-preserving pose sequences.

---

## 1. System Architecture

```text
Browser Camera (Webcam)
      │
      ▼
useCamera (stream lifecycle)
      │
      ▼
usePoseLandmarker (@mediapipe/tasks-vision PoseLandmarker)
      │
      ▼
Inference Loop (requestAnimationFrame)
      │
      ├──────────────────────────────┐
      ▼                              ▼
Canvas Overlay (drawPose)     Pose Result Serializer
(Milestone A visualizer)      (serializePoseResult)
                                     │
                                     ▼
                              PoseFrame
                              (timestampMs + 33 landmarks + quality)
                                     │
                                     ▼
                              usePoseSequenceCapture
                              (PoseSequenceBuffer)
                                     │
                                     ├── FIFO Eviction (max 10s / 300 frames)
                                     ├── Throttled Diagnostic Metrics
                                     ▼
                              PoseSequence Snapshot
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
                Buffer UI Status           Explicit JSON Export
                (PoseSequencePanel)      (downloadSequenceAsJson)
                                                  │
                                                  ▼
                                       Milestone C ML Dataset
```

---

## 2. Pose Sequence Schema (v1.0.0)

All captured and exported data strictly adheres to **Schema Version 1.0.0**.

### 2.1 File Envelope (`PoseSequence`)

```json
{
  "schemaVersion": "1.0.0",
  "captureId": "4a73f8b0-8c29-436f-b1e2-63b7e7c8442a",
  "startedAt": "2026-11-22T11:00:00.000Z",
  "endedAt": "2026-11-22T11:00:10.000Z",
  "frames": [ ... ],
  "metadata": {
    "poseSdk": "@mediapipe/tasks-vision@1.2.3",
    "poseModelVersion": "pose_landmarker_lite.task",
    "coordinateConvention": "normalized [0, 1] relative to video frame; origin top-left; depth z relative to hips",
    "captureCadenceFps": 29.8,
    "durationMs": 9980,
    "totalFrames": 298,
    "exportedAt": "2026-11-22T11:00:12.000Z",
    "notes": "Normal walking and sitting on chair"
  }
}
```

### 2.2 Frame Contract (`PoseFrame`)

```json
{
  "timestampMs": 1033,
  "frameIndex": 1,
  "landmarks": [
    {
      "x": 0.512,
      "y": 0.231,
      "z": -0.045,
      "visibility": 0.985,
      "presence": 0.991
    }
  ],
  "quality": {
    "poseDetected": true,
    "validLandmarkCount": 33,
    "expectedLandmarkCount": 33,
    "meanVisibility": 0.892
  }
}
```

### 2.3 Landmark Definition & Indices

Every frame contains an array of exactly 33 landmarks corresponding to MediaPipe's topological order:

| Index | Name | Body Region |
|---|---|---|
| 0 | `nose` | Head / Face |
| 1 | `left_eye_inner` | Head / Face |
| 2 | `left_eye` | Head / Face |
| 3 | `left_eye_outer` | Head / Face |
| 4 | `right_eye_inner` | Head / Face |
| 5 | `right_eye` | Head / Face |
| 6 | `right_eye_outer` | Head / Face |
| 7 | `left_ear` | Head / Face |
| 8 | `right_ear` | Head / Face |
| 9 | `mouth_left` | Head / Face |
| 10 | `mouth_right` | Head / Face |
| 11 | `left_shoulder` | Torso / Upper Body |
| 12 | `right_shoulder` | Torso / Upper Body |
| 13 | `left_elbow` | Left Arm |
| 14 | `right_elbow` | Right Arm |
| 15 | `left_wrist` | Left Arm |
| 16 | `right_wrist` | Right Arm |
| 17 | `left_pinky` | Left Hand |
| 18 | `right_pinky` | Right Hand |
| 19 | `left_index` | Left Hand |
| 20 | `right_index` | Right Hand |
| 21 | `left_thumb` | Left Hand |
| 22 | `right_thumb` | Right Hand |
| 23 | `left_hip` | Torso / Pelvis |
| 24 | `right_hip` | Torso / Pelvis |
| 25 | `left_knee` | Left Leg |
| 26 | `right_knee` | Right Leg |
| 27 | `left_ankle` | Left Leg |
| 28 | `right_ankle` | Right Leg |
| 29 | `left_heel` | Left Foot |
| 30 | `right_heel` | Right Foot |
| 31 | `left_foot_index` | Left Foot |
| 32 | `right_foot_index` | Right Foot |

### 2.4 Coordinate Conventions

- **X coordinate:** Normalized between `[0.0, 1.0]`, where `0.0` represents the left edge of the video frame and `1.0` represents the right edge.
- **Y coordinate:** Normalized between `[0.0, 1.0]`, where `0.0` represents the top edge of the video frame and `1.0` represents the bottom edge.
- **Z coordinate:** Represents depth relative to the midpoint of the hips. Smaller values are closer to the camera.
- **Visibility:** Likelihood between `[0.0, 1.0]` that the landmark is not occluded by other body parts or objects.
- **Presence:** Likelihood between `[0.0, 1.0]` that the landmark is within the frame bounds.

---

## 3. Rolling Sequence Buffer

The `PoseSequenceBuffer` maintains a bounded, chronological sliding window in browser RAM:
- **Default Duration Limit:** 10,000 ms (10 seconds).
- **Default Frame Count Limit:** 300 frames.
- **Eviction Strategy:** First-In, First-Out (FIFO) eviction of the oldest frames when either the duration or frame count limit is reached.
- **Memory Safety:** Bounded memory usage prevents memory leaks during long-running sessions.
- **Snapshot Isolation:** Calling `.getSnapshot()` or `.toSequence()` returns an independent snapshot array, decoupling downstream consumers from buffer mutations.

---

## 4. Privacy & Safety Guarantees

1. **No Raw Video or Audio:** Video frames from the webcam are processed entirely in-memory on the client device. Raw frames are never written to disk or sent over network sockets.
2. **Opt-in Local Export:** Pose sequences are never automatically persisted. Export to JSON is triggered only through deliberate user action in the UI.
3. **No Personal Identifiers:** Capture files contain only numerical landmark arrays, timestamps, and an anonymous UUID `captureId`.
4. **Clinical Disclaimer:** This pipeline collects research data and motion sequences. It does not classify falls or provide medical or emergency response guarantees.

---

## 5. Instructions for Downstream Milestone C (Model Training)

When developing the classifier in Milestone C:
1. **Cadence Resampling:** Input sequences reflect real-world browser capture cadence (~25–35 FPS). Use linear or spline interpolation in your preprocessing pipeline to resample windows to a uniform time-step (e.g. 30 Hz or 20 Hz fixed steps) rather than altering raw capture timestamps.
2. **Missing Landmarks / Occlusion:** Check each landmark's `visibility` score and `quality.validLandmarkCount`. Frames with partial body visibility should be normalized relative to visible torso keypoints (e.g. shoulders #11/#12 and hips #23/#24).
3. **Window Extraction:** Recommended sliding window for fall dynamics is 2.0–3.0 seconds (e.g. 60–90 frames at 30 FPS).

---

# Milestone D: Real-Time ML Fall Detection & Caregiver Escalation

Milestone D integrates the trained Milestone C Random Forest classifier (`random_forest_baseline` v1.0.0) into the live frontend application, implementing real-time continuous inference, temporal confirmation, elderly user confirmation, and caregiver notifications.

## 1. End-to-End Workflow

```text
Browser Video Frame
       │
       ▼
MediaPipe Pose Landmarker (33 Body Landmarks)
       │
       ▼
Pose Frame Serializer (PoseFrame Schema 1.0.0)
       │
       ▼
Inference Window Buffer (Rolling 2.5s window, 500ms stride)
       │
       ▼
Authenticated Express Backend Proxy (/api/fall-detection/predict)
       │
       ▼
Internal Python FastAPI Service (POST /internal/v1/predict)
       │
       ▼
FallClassifier.predict() (scikit-learn Random Forest model)
       │
       ▼
Temporal Confirmation Engine (2 consecutive high-risk windows >= 0.1 threshold)
       │
  ┌────┴─────────────────────────────┐
  ▼                                  ▼
Normal Movement               Candidate / Suspected Fall
                                     │
                                     ▼
                       Elderly Confirmation Dialog
                       (15-second visual & audio countdown)
                                     │
                       ┌─────────────┴─────────────┐
                       ▼                           ▼
                 "I'm Okay"               "I Need Help" / Timeout
                       │                           │
                       ▼                           ▼
                 Mark False Alarm          Persist Fall Event
                 & Enter Cooldown          & Dispatch Caregiver Alert
```

## 2. Key Modules & Components

- **`InferenceWindowBuffer` (`utils/inferenceWindowBuffer.ts`)**: Continuous temporal buffer collecting pose frames, enforcing minimum frame counts (25 frames) and temporal stride (500ms) without overlapping requests.
- **`TemporalConfirmationEngine` (`utils/temporalConfirmationEngine.ts`)**: State machine implementing temporal confirmation (`idle` -> `monitoring` -> `candidate` -> `suspected_fall` -> `awaiting_response` -> `alert_sent` -> `cooldown`). Prevents single anomalous frames from triggering false alarms.
- **`FallConfirmationDialog` (`components/FallConfirmationDialog.tsx`)**: Prominent modal with Web Audio alert sound, 15-second countdown timer, and large touch targets for "I'm Okay" and "I Need Help".
- **`FallDetectionStatus` (`components/FallDetectionStatus.tsx`)**: Real-time diagnostic panel displaying model version, latency in ms, inference FPS, and fall probability gauge with 10% threshold marker.
- **`CaregiverAlertBanner` (`components/CaregiverAlertBanner.tsx`)**: Top-level alert notification displayed to linked family members/caregivers for active unresolved events.
- **`FallEventHistoryPage` (`pages/FallEventHistoryPage.tsx`)**: Comprehensive historical incident viewer with filtering across active, acknowledged, resolved, and false alarm statuses.
