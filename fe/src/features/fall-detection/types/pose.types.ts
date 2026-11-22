import type { NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error';

export type CameraErrorType =
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'not-supported'
  | 'secure-context-required'
  | 'unknown';

export interface CameraError {
  type: CameraErrorType;
  message: string;
  details?: string;
}

export type ModelStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

export type PosePresenceStatus =
  | 'idle'
  | 'requesting-camera'
  | 'loading-model'
  | 'looking-for-person'
  | 'pose-detected'
  | 'error';

export interface PoseStats {
  fps: number;
  poseCount: number;
  lastInferenceTimeMs: number;
}

export interface PoseLandmarkerConfig {
  wasmBasePath?: string;
  modelAssetPath?: string;
  delegate?: 'GPU' | 'CPU';
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export interface DrawPoseOptions {
  connectorColor?: string;
  connectorWidth?: number;
  landmarkColor?: string;
  landmarkBorderColor?: string;
  landmarkRadius?: number;
  minVisibility?: number;
  showLandmarkIndices?: boolean;
}

export type { NormalizedLandmark, PoseLandmarkerResult };
export * from './pose-sequence.types';

