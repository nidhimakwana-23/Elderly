import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  EXPECTED_LANDMARK_COUNT,
  type PoseFrame,
  type PoseFrameQuality,
  type PoseLandmark,
} from '../types/pose-sequence.types';

export interface RawLandmarkLike {
  x?: number;
  y?: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

export interface RawPoseResultLike {
  landmarks?: RawLandmarkLike[][];
}

export interface SerializeOptions {
  /**
   * Minimum visibility required to consider landmark valid for quality scoring.
   * Default: 0.0 (any landmark with finite coordinates is counted).
   */
  minVisibility?: number;

  /**
   * Index of person to serialize when multiple persons are detected.
   * Default: 0 (primary tracked person).
   */
  personIndex?: number;
}

/**
 * Checks whether a number is finite and not NaN.
 */
function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Normalizes and validates a single landmark.
 * Ensures coordinates are finite numbers.
 */
export function sanitizeLandmark(raw: RawLandmarkLike): PoseLandmark {
  const x = isFiniteNumber(raw.x) ? raw.x : 0;
  const y = isFiniteNumber(raw.y) ? raw.y : 0;

  const landmark: PoseLandmark = { x, y };

  if (isFiniteNumber(raw.z)) {
    landmark.z = raw.z;
  }
  if (isFiniteNumber(raw.visibility)) {
    // Clamp visibility to [0, 1]
    landmark.visibility = Math.max(0, Math.min(1, raw.visibility));
  }
  if (isFiniteNumber(raw.presence)) {
    // Clamp presence to [0, 1]
    landmark.presence = Math.max(0, Math.min(1, raw.presence));
  }

  return landmark;
}

/**
 * Serializes a MediaPipe PoseLandmarkerResult into an application-owned PoseFrame.
 *
 * Policy:
 * - If no person/landmarks are present in the result, returns null.
 * - Single-person policy: selects landmarks[personIndex] (default 0).
 * - Maps all 33 landmarks in deterministic MediaPipe order (indices 0..32).
 * - Non-finite values are sanitized and quality counts reflect only valid landmarks.
 */
export function serializePoseResult(
  result: RawPoseResultLike | PoseLandmarkerResult | null | undefined,
  timestampMs: number,
  frameIndex: number,
  options?: SerializeOptions,
): PoseFrame | null {
  if (!result || !result.landmarks || result.landmarks.length === 0) {
    return null;
  }

  const personIndex = options?.personIndex ?? 0;
  const rawLandmarks = result.landmarks[personIndex];

  if (!rawLandmarks || rawLandmarks.length === 0) {
    return null;
  }

  const minVisibility = options?.minVisibility ?? 0.0;
  const landmarks: PoseLandmark[] = [];
  let validLandmarkCount = 0;
  let totalVisibility = 0;
  let visibilityCount = 0;

  for (let i = 0; i < rawLandmarks.length; i++) {
    const raw = rawLandmarks[i];
    const sanitized = sanitizeLandmark(raw);
    landmarks.push(sanitized);

    // Coordinate validation check
    const isCoordValid =
      isFiniteNumber(raw.x) &&
      isFiniteNumber(raw.y) &&
      (raw.visibility === undefined || raw.visibility >= minVisibility);

    if (isCoordValid) {
      validLandmarkCount++;
    }

    if (sanitized.visibility !== undefined) {
      totalVisibility += sanitized.visibility;
      visibilityCount++;
    }
  }

  const meanVisibility =
    visibilityCount > 0 ? totalVisibility / visibilityCount : undefined;

  const quality: PoseFrameQuality = {
    poseDetected: true,
    validLandmarkCount,
    expectedLandmarkCount: EXPECTED_LANDMARK_COUNT,
    meanVisibility:
      meanVisibility !== undefined
        ? Math.round(meanVisibility * 1000) / 1000
        : undefined,
  };

  return {
    timestampMs: Math.round(timestampMs),
    frameIndex,
    landmarks,
    quality,
  };
}
