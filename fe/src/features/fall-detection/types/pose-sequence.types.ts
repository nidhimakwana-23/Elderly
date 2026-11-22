/**
 * Milestone B: Pose Sequence Capture Data Contracts
 * Defines stable, application-owned types for landmarks, frames, rolling buffer, and exported sequences.
 */

export const MEDIAPIPE_LANDMARK_NAMES = [
  'nose', // 0
  'left_eye_inner', // 1
  'left_eye', // 2
  'left_eye_outer', // 3
  'right_eye_inner', // 4
  'right_eye', // 5
  'right_eye_outer', // 6
  'left_ear', // 7
  'right_ear', // 8
  'mouth_left', // 9
  'mouth_right', // 10
  'left_shoulder', // 11
  'right_shoulder', // 12
  'left_elbow', // 13
  'right_elbow', // 14
  'left_wrist', // 15
  'right_wrist', // 16
  'left_pinky', // 17
  'right_pinky', // 18
  'left_index', // 19
  'right_index', // 20
  'left_thumb', // 21
  'right_thumb', // 22
  'left_hip', // 23
  'right_hip', // 24
  'left_knee', // 25
  'right_knee', // 26
  'left_ankle', // 27
  'right_ankle', // 28
  'left_heel', // 29
  'right_heel', // 30
  'left_foot_index', // 31
  'right_foot_index', // 32
] as const;

export type PoseLandmarkName = (typeof MEDIAPIPE_LANDMARK_NAMES)[number];

export const EXPECTED_LANDMARK_COUNT = 33;
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Normalized 3D landmark representation.
 * - x: [0.0, 1.0] normalized to video width (0 is left, 1 is right)
 * - y: [0.0, 1.0] normalized to video height (0 is top, 1 is bottom)
 * - z: Depth relative to midpoint of hips (smaller values closer to camera)
 * - visibility: Likelihood [0.0, 1.0] that landmark is visible (not occluded)
 * - presence: Likelihood [0.0, 1.0] that landmark is inside frame boundary
 */
export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

/**
 * Frame quality indicators.
 */
export interface PoseFrameQuality {
  poseDetected: boolean;
  validLandmarkCount: number;
  expectedLandmarkCount: number;
  meanVisibility?: number;
}

/**
 * Structured single-frame pose capture.
 */
export interface PoseFrame {
  timestampMs: number;
  frameIndex: number;
  landmarks: PoseLandmark[];
  quality: PoseFrameQuality;
}

/**
 * Metadata recorded for a capture session or sequence export.
 * Privacy invariant: Must never contain personally identifying information.
 */
export interface PoseSequenceMetadata {
  poseSdk: string;
  poseModelVersion?: string;
  coordinateConvention: string;
  captureCadenceFps?: number;
  durationMs?: number;
  totalFrames?: number;
  exportedAt?: string;
  notes?: string;
}

/**
 * Complete pose sequence contract (used for in-memory session or JSON export).
 */
export interface PoseSequence {
  schemaVersion: string;
  captureId: string;
  startedAt: string;
  endedAt?: string;
  frames: PoseFrame[];
  metadata: PoseSequenceMetadata;
}

/**
 * Configuration options for the rolling sequence buffer.
 */
export interface BufferConfig {
  maxDurationMs: number; // e.g. 10000 (10 seconds)
  maxFrameCount: number; // e.g. 300 (10s @ 30fps)
}

/**
 * Rolling buffer status and diagnostic statistics.
 */
export interface BufferStats {
  frameCount: number;
  maxFrameCapacity: number;
  retainedDurationMs: number;
  maxDurationMs: number;
  oldestTimestampMs: number | null;
  newestTimestampMs: number | null;
  droppedFrameCount: number;
  noPoseFrameCount: number;
  averageFps: number;
  meanVisibility: number;
  capacityUtilizationRatio: number; // 0.0 to 1.0
}

/**
 * Sequence capture state.
 */
export type CaptureState = 'idle' | 'recording' | 'stopped';
