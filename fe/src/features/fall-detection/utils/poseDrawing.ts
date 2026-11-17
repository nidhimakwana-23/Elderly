import { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark, DrawPoseOptions } from '../types/pose.types';

// Fallback connections in case PoseLandmarker.POSE_CONNECTIONS is accessed before class initialization
export const DEFAULT_POSE_CONNECTIONS: Array<{ start: number; end: number }> =
  PoseLandmarker?.POSE_CONNECTIONS ?? [
    // Torso
    { start: 11, end: 12 },
    { start: 11, end: 23 },
    { start: 12, end: 24 },
    { start: 23, end: 24 },
    // Left arm
    { start: 11, end: 13 },
    { start: 13, end: 15 },
    { start: 15, end: 17 },
    { start: 15, end: 19 },
    { start: 15, end: 21 },
    { start: 17, end: 19 },
    // Right arm
    { start: 12, end: 14 },
    { start: 14, end: 16 },
    { start: 16, end: 18 },
    { start: 16, end: 20 },
    { start: 16, end: 22 },
    { start: 18, end: 20 },
    // Left leg
    { start: 23, end: 25 },
    { start: 25, end: 27 },
    { start: 27, end: 29 },
    { start: 27, end: 31 },
    { start: 29, end: 31 },
    // Right leg
    { start: 24, end: 26 },
    { start: 26, end: 28 },
    { start: 28, end: 30 },
    { start: 28, end: 32 },
    { start: 30, end: 32 },
    // Face
    { start: 0, end: 1 },
    { start: 1, end: 2 },
    { start: 2, end: 3 },
    { start: 3, end: 7 },
    { start: 0, end: 4 },
    { start: 4, end: 5 },
    { start: 5, end: 6 },
    { start: 6, end: 8 },
    { start: 9, end: 10 },
  ];

/**
 * Clears the 2D canvas.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Renders detected landmarks and skeleton connectors onto the canvas.
 * Landmarks are normalized [0, 1] relative to the video frame dimensions.
 */
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  options?: DrawPoseOptions,
): void {
  if (!landmarks || landmarks.length === 0) return;

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const minVisibility = options?.minVisibility ?? 0.4;
  const connectorColor = options?.connectorColor ?? '#06b6d4'; // Cyan-500
  const connectorWidth = options?.connectorWidth ?? 3.5;
  const landmarkColor = options?.landmarkColor ?? '#ec4899'; // Pink-500
  const landmarkBorderColor = options?.landmarkBorderColor ?? '#ffffff';
  const landmarkRadius = options?.landmarkRadius ?? 4;

  const connections = PoseLandmarker?.POSE_CONNECTIONS ?? DEFAULT_POSE_CONNECTIONS;

  // 1. Draw connections
  ctx.save();
  ctx.strokeStyle = connectorColor;
  ctx.lineWidth = connectorWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const connection of connections) {
    const p1 = landmarks[connection.start];
    const p2 = landmarks[connection.end];

    if (!p1 || !p2) continue;

    // Filter low-confidence or invisible landmarks
    if (
      (p1.visibility !== undefined && p1.visibility < minVisibility) ||
      (p2.visibility !== undefined && p2.visibility < minVisibility)
    ) {
      continue;
    }

    const x1 = p1.x * width;
    const y1 = p1.y * height;
    const x2 = p2.x * width;
    const y2 = p2.y * height;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // 2. Draw landmarks (joints)
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (lm.visibility !== undefined && lm.visibility < minVisibility) {
      continue;
    }

    const x = lm.x * width;
    const y = lm.y * height;

    // Outer ring / border
    ctx.beginPath();
    ctx.arc(x, y, landmarkRadius + 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = landmarkBorderColor;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, landmarkRadius, 0, 2 * Math.PI);
    // Key joints (shoulders: 11, 12, hips: 23, 24, knees: 25, 26) can have distinct accent
    const isMajorJoint = [11, 12, 23, 24, 25, 26].includes(i);
    ctx.fillStyle = isMajorJoint ? '#f59e0b' : landmarkColor;
    ctx.fill();
  }

  ctx.restore();
}
