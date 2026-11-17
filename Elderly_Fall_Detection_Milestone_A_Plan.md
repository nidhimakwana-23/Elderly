# Elderly Care – Fall Detection: Milestone A Implementation Plan

## Overall idea

The overall goal is to build a browser-based fall-detection feature for the Elderly Care application. The website will use the device camera to capture a live video feed and MediaPipe Pose Landmarker for Web (`@mediapipe/tasks-vision`) to identify the person's body landmarks in each frame. Those landmarks will form a time-ordered stream of pose data that can later be used to train and run a custom machine-learning model to recognize fall-like movements. If a potential fall is detected in a later phase, the application can add confirmation and alert workflows. **This first milestone deliberately stops at live pose detection and visualization: it does not train, run, or claim to provide fall detection.**

---

# Milestone A – Live Camera and Pose Landmark Visualization

## 1. Objective

Build a dedicated page in the existing Elderly Care website that:

- Requests permission to use the user's camera.
- Displays the live camera feed.
- Runs MediaPipe Pose Landmarker on the live video.
- Detects the person's body landmarks continuously.
- Draws a connected skeleton/pose overlay on top of the video.
- Provides clear camera and pose-detection status.
- Allows the user to start and stop the camera safely.

The milestone is complete when a person can stand or move in front of the camera and see the landmark skeleton follow their body in near real time.

## 2. Explicit scope

### Included

- A dedicated Fall Detection Demo page or screen.
- Browser camera access using `navigator.mediaDevices.getUserMedia`.
- MediaPipe Pose Landmarker Web integration using `@mediapipe/tasks-vision`.
- Loading the required MediaPipe WASM runtime and pose model assets.
- Live video rendering.
- Per-frame pose inference.
- Landmark and skeleton rendering on a canvas overlay.
- Start/Stop controls and useful loading, permission, and error states.
- Resource cleanup when the user stops the camera or leaves the page.
- Basic manual testing and a short README note explaining how to run the demo.

### Not included in Milestone A

- Training or running a custom fall-detection model.
- Deciding whether a person has fallen.
- Fall alerts, notifications, emergency calls, or caregiver workflows.
- Saving or uploading camera footage.
- Persisting pose sequences or building a training dataset.
- Backend APIs or database changes for fall events.
- Claims that the feature is medically validated or suitable as an emergency-monitoring system.

Keep this boundary strict. Do not add a placeholder classifier or label a pose as a fall in this milestone.

## 3. Recommended technology

Use **MediaPipe Pose Landmarker for Web** from Google's MediaPipe Tasks Vision package:

```bash
npm install @mediapipe/tasks-vision
```

This is the browser-oriented MediaPipe API suitable for a website. Do not use the mobile Google ML Kit Pose Detection SDK for this browser implementation.

Use the existing frontend framework, routing, styling system, and component conventions already present in the repository. Inspect the project first and adapt the suggested structure rather than introducing a second frontend architecture.

## 4. User experience

The page should have a simple layout:

1. **Page heading:** “Fall Detection – Pose Demo” or another clearly non-clinical demo label.
2. **Camera area:** live video with the pose skeleton drawn over the same area.
3. **Primary control:** “Start Camera” when stopped and “Stop Camera” when running.
4. **Camera status:** examples include “Camera stopped”, “Requesting camera access”, “Camera ready”, and “Camera unavailable”.
5. **Pose status:** examples include “Loading pose model”, “Looking for a person”, and “Pose detected”.
6. **Optional technical details:** inference FPS or number of detected poses, if this can be shown without clutter.

Do not display a “Fall detected” status in Milestone A. The UI should make it clear that this screen demonstrates pose tracking only.

## 5. Suggested implementation structure

Adapt these names to the existing repository conventions:

```text
src/
  features/
    fall-detection/
      pages/
        FallDetectionDemoPage.tsx
      components/
        CameraPreview.tsx
        PoseOverlay.tsx
        PoseStatusPanel.tsx
      hooks/
        useCamera.ts
        usePoseLandmarker.ts
      utils/
        poseDrawing.ts
      types/
        pose.types.ts
```

Keep responsibilities separated:

- `FallDetectionDemoPage`: composes the screen and owns the overall start/stop experience.
- `useCamera`: requests the camera, exposes the video stream/status, and stops media tracks.
- `usePoseLandmarker`: initializes and owns the MediaPipe task and runs inference on video frames.
- `CameraPreview`: renders the video element.
- `PoseOverlay`: renders landmarks and connections in a canvas aligned with the video.
- `poseDrawing`: contains drawing and coordinate-mapping helpers.
- `pose.types`: contains any application-level TypeScript types needed for the displayed pose result.

Avoid putting camera access, model initialization, inference, and canvas drawing into one large component.

## 6. Camera access

Use the browser's `navigator.mediaDevices.getUserMedia` API.

Suggested initial constraints:

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
});
```

Implementation requirements:

- Attach the returned stream to a video element using `video.srcObject`.
- Set the video element to play inline and muted.
- Wait until video metadata is available and the video has usable dimensions before starting inference.
- Handle permission denied, no camera found, camera already in use, unsupported browser, and other camera errors.
- Do not request microphone access.
- Explain in the UI if camera access requires HTTPS or localhost.
- Stop every stream track when the user presses Stop, the component unmounts, or the user navigates away.
- Do not leave the camera active after leaving the page.

## 7. MediaPipe Pose Landmarker setup

Initialize one reusable Pose Landmarker instance; do not recreate it for every video frame.

Implementation requirements:

- Import the required classes from `@mediapipe/tasks-vision`.
- Initialize the Vision task fileset/WASM runtime.
- Configure Pose Landmarker for video input (`runningMode: "VIDEO"`).
- Start with `numPoses: 1` because the initial demo is intended to track one person.
- Use a supported delegate such as GPU where available and stable; provide a fallback strategy if initialization fails.
- Load the pose model from a project-managed, documented asset location.
- Confirm the model asset and WASM paths against the current official MediaPipe documentation and the chosen package version. Do not invent or assume a model URL.
- Show a loading state while the model initializes.
- Handle initialization failures with a visible, actionable error.
- Close/dispose of the Pose Landmarker instance when the page is torn down.

Keep model and WASM asset paths configurable and document where they are served from in the frontend build.

## 8. Real-time inference loop

Once the camera is ready, process video frames using `requestAnimationFrame` or an equivalent frame loop.

For each eligible frame:

1. Confirm the video element has current frame data and non-zero dimensions.
2. Obtain a monotonically increasing timestamp in milliseconds.
3. Call the Pose Landmarker video inference method, such as `detectForVideo(videoElement, timestampMs)`.
4. Read the returned pose landmarks.
5. Draw the latest landmarks and pose connections on the overlay canvas.
6. Continue to the next frame while the camera/demo is active.

Important implementation details:

- Create the Pose Landmarker once and reuse it.
- Avoid starting multiple inference loops if the user clicks Start repeatedly.
- Avoid overlapping inference calls if the inference method is still processing a previous frame.
- Do not push every frame's landmark array into React state. Keep high-frequency inference/drawing work in refs or an appropriate rendering loop; update React state only for low-frequency status changes.
- Cancel the animation frame loop on Stop and unmount.
- Clear the canvas when no pose is detected so an old skeleton is not left visible.
- Handle inference errors without crashing the page.
- If performance is poor, process fewer frames rather than allowing an unbounded backlog.

MediaPipe's synchronous web inference can affect UI responsiveness on slower devices. For this first demo, start with the simplest stable implementation and measure performance. Consider a worker-based approach only if testing shows that main-thread inference is causing a real problem.

## 9. Drawing the pose overlay

Render the camera video and canvas in the same positioned container.

The overlay must:

- Match the displayed video dimensions and aspect ratio.
- Resize when the container or browser window changes size.
- Use the same crop/fit behavior as the video.
- Account for horizontal mirroring if the preview is mirrored.
- Clear the previous frame before drawing the latest pose.
- Draw visible landmarks and the connections between them.
- Avoid drawing low-visibility landmarks if they make the skeleton misleading.
- Keep the canvas aligned with the video at different screen sizes.

Use MediaPipe's documented pose connection definitions (for example, `PoseLandmarker.POSE_CONNECTIONS`) and drawing utilities where appropriate. Do not hard-code a guessed landmark ordering or connection list.

If the video preview is mirrored for a natural selfie-camera experience, ensure the canvas is mirrored in exactly the same way. The skeleton must remain attached to the person's body rather than appearing offset or reversed.

## 10. Pose result handling

For Milestone A, the pose result only needs to support visualization and basic status.

- Read the landmark coordinates returned by MediaPipe.
- Use the documented landmark structure and ordering from the installed package version.
- Check that a pose exists before drawing.
- Use visibility/presence information where available to decide whether a landmark should be drawn.
- Keep the raw result in memory only for the current demo frame.
- Do not persist the landmarks, send them to the backend, or record video in this milestone.

The code should be organized so a later milestone can add a separate pose-sequence capture layer without rewriting camera access or the MediaPipe inference loop.

## 11. Start, stop, and cleanup behavior

**Start Camera**

- Request camera access.
- Attach the stream to the video element.
- Initialize the Pose Landmarker if it has not already been initialized.
- Wait for the video to be ready.
- Start the inference/render loop.
- Update the UI statuses.

**Stop Camera**

- Stop the inference loop.
- Cancel any pending animation frame.
- Stop all camera media tracks.
- Detach the stream from the video element.
- Clear the canvas.
- Reset the visible camera/pose status.
- Keep the page usable so the user can start again.

**On page unmount**

- Perform the same cleanup as Stop.
- Close the MediaPipe task instance if it is no longer needed.
- Ensure no camera indicator remains active and no animation loop continues in the background.

Make cleanup safe to call more than once.

## 12. Error and empty states

Handle these cases gracefully:

| Scenario | Expected behavior |
|---|---|
| Camera permission denied | Explain that permission is required and show how to retry |
| No camera available | Show a clear camera-unavailable message |
| Camera already in use | Explain that another application may be using it |
| Browser does not support camera access | Show a compatibility message |
| MediaPipe model is loading | Show a loading indicator |
| MediaPipe model fails to load | Show an error and allow retry |
| No person in frame | Keep the video visible and show “Looking for a person” |
| Person leaves the frame | Clear the skeleton and return to “Looking for a person” |
| User stops the camera | Stop tracks and inference, clear the overlay |
| User navigates away | Release camera and inference resources |

## 13. Testing checklist

### Camera

- [ ] Start Camera requests permission and displays the live feed.
- [ ] Stop Camera stops the live feed and releases the camera.
- [ ] Starting again after stopping works.
- [ ] Denied permission produces a useful message.
- [ ] Missing or busy camera produces a useful message.
- [ ] Navigating away releases the camera.
- [ ] Repeated Start/Stop clicks do not create duplicate streams or loops.

### Pose detection

- [ ] The model initializes successfully.
- [ ] A single person in view produces landmarks.
- [ ] The skeleton follows standing, walking in place, and normal upper/lower body movement.
- [ ] No person in view clears the old skeleton.
- [ ] The overlay stays aligned when the window is resized.
- [ ] Mirrored preview and overlay remain consistent.
- [ ] Inference remains responsive on the target development laptop/browser.

### Browser and layout

- [ ] Test in the primary supported desktop browser.
- [ ] Check the page at common desktop and laptop viewport sizes.
- [ ] Confirm camera access works on localhost and the intended HTTPS deployment environment.
- [ ] Confirm no microphone permission is requested.

## 14. Acceptance criteria

Milestone A is complete when all of the following are true:

1. The dedicated demo page is reachable through the application's existing routing/navigation conventions.
2. The user can start the camera and see the live video.
3. MediaPipe Pose Landmarker initializes successfully in the browser.
4. A visible person produces a pose skeleton/landmark overlay that follows their movement.
5. The overlay remains aligned with the video during resizing and any preview mirroring.
6. The user can stop the camera and all camera tracks and inference loops are stopped.
7. Camera/model errors and the no-person state are handled clearly.
8. No fall classification, alerting, video recording, or backend persistence has been added.

## 15. Suggested Codex implementation prompt

```text
Implement Milestone A only for the Elderly Care application: a browser-based live camera page that uses Google's MediaPipe Pose Landmarker for Web through @mediapipe/tasks-vision and draws the detected body skeleton over the live video.

Before coding:
1. Inspect the repository and identify the frontend framework, routing, styling conventions, and existing page/component patterns.
2. Follow the existing architecture. Do not create a separate app or replace existing dependencies unnecessarily.
3. Check the installed/current @mediapipe/tasks-vision API and use documented model/WASM asset paths. Do not invent model URLs.

Requirements:
- Add a dedicated Fall Detection Pose Demo page using the existing routing conventions.
- Add a Start Camera / Stop Camera control.
- Use navigator.mediaDevices.getUserMedia with video only; do not request audio.
- Display the live camera feed.
- Install/use @mediapipe/tasks-vision and initialize one reusable Pose Landmarker in VIDEO mode, initially configured for one pose.
- Run inference on ready video frames using a requestAnimationFrame-based loop or another suitable browser frame loop.
- Draw landmarks and documented pose connections on a canvas aligned exactly with the displayed video.
- Keep video and overlay alignment correct on resize and when the preview is mirrored.
- Show clear camera/model/pose states, including permission denied, camera unavailable, model loading/error, pose detected, and no person detected.
- Prevent duplicate inference loops and avoid updating React state on every video frame.
- Stop animation loops, stop every media stream track, clear the canvas, detach the stream, and close/dispose resources on Stop and component unmount.
- Make cleanup safe to call repeatedly.
- Keep camera, MediaPipe inference, drawing, and page composition in appropriately separated hooks/components/utilities, following repository conventions.
- Add concise setup/run documentation if required.

Strict scope:
- Do not implement a fall-detection classifier.
- Do not train a model.
- Do not label any pose as a fall.
- Do not add alerts, notifications, caregiver workflows, backend APIs, database changes, video recording, or pose-data persistence.
- Do not modify or replace the existing chatbot/AI functionality.
- Do not claim that the demo detects falls.

After implementation:
- Run the available lint, type-check, and build commands.
- Fix errors introduced by this work.
- Summarize changed files, setup requirements, how to run the demo, and any limitations.

Acceptance test: when a person stands or moves in front of the camera, the browser displays a live video feed with a correctly aligned skeleton overlay that follows the person's body; Stop Camera releases the camera and stops inference.
```

## 16. What comes after Milestone A

Once this demo works reliably, the next milestone can add timestamped pose-sequence capture. Those sequences can later be used to create a labelled dataset and train a custom fall-detection model. That work is intentionally outside this implementation scope.
