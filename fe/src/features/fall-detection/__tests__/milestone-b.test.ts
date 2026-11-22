import { describe, it, expect } from 'vitest';

import {
  serializePoseResult,
  sanitizeLandmark,
} from '../utils/poseSerializer';
import {
  PoseSequenceBuffer,
} from '../utils/poseSequenceBuffer';
import {
  serializeSequenceToJson,
  downloadSequenceAsJson,
} from '../utils/poseExporter';
import {
  EXPECTED_LANDMARK_COUNT,
  CURRENT_SCHEMA_VERSION,
  type PoseFrame,
} from '../types/pose-sequence.types';

// Helper to generate mock MediaPipe landmarks
function generateMockLandmarks(count = 33, visibility = 0.9) {
  return Array.from({ length: count }, (_, i) => ({
    x: 0.1 + (i % 10) * 0.08,
    y: 0.2 + Math.floor(i / 10) * 0.2,
    z: -0.05 + i * 0.01,
    visibility,
    presence: 0.95,
  }));
}

// Helper to generate mock PoseFrame
function createMockPoseFrame(timestampMs: number, frameIndex: number, visibility = 0.9): PoseFrame {
  const landmarks = generateMockLandmarks(33, visibility).map(sanitizeLandmark);
  return {
    timestampMs,
    frameIndex,
    landmarks,
    quality: {
      poseDetected: true,
      validLandmarkCount: 33,
      expectedLandmarkCount: EXPECTED_LANDMARK_COUNT,
      meanVisibility: visibility,
    },
  };
}

describe('Milestone B: Pose Result Adapter & Serializer', () => {
  it('serializes a valid MediaPipe PoseLandmarkerResult into PoseFrame', () => {
    const rawLandmarks = generateMockLandmarks(33, 0.85);
    const mockResult = {
      landmarks: [rawLandmarks],
      worldLandmarks: [],
    };

    const frame = serializePoseResult(mockResult, 1000.4, 0);

    expect(frame).not.toBeNull();
    expect(frame?.frameIndex).toBe(0);
    expect(frame?.timestampMs).toBe(1000); // Rounded
    expect(frame?.landmarks.length).toBe(EXPECTED_LANDMARK_COUNT);
    expect(frame?.quality.poseDetected).toBe(true);
    expect(frame?.quality.validLandmarkCount).toBe(33);
    expect(frame?.quality.expectedLandmarkCount).toBe(33);
    expect(frame?.quality.meanVisibility).toBe(0.85);
  });

  it('preserves exact landmark ordering (nose=0, feet=31, 32)', () => {
    const rawLandmarks = generateMockLandmarks(33);
    rawLandmarks[0] = { x: 0.5, y: 0.2, z: 0.0, visibility: 0.99, presence: 0.99 }; // nose
    rawLandmarks[31] = { x: 0.4, y: 0.95, z: 0.1, visibility: 0.8, presence: 0.85 }; // left foot
    rawLandmarks[32] = { x: 0.6, y: 0.96, z: 0.1, visibility: 0.8, presence: 0.85 }; // right foot

    const mockResult = { landmarks: [rawLandmarks], worldLandmarks: [] };
    const frame = serializePoseResult(mockResult, 1500, 1);

    expect(frame).not.toBeNull();
    expect(frame?.landmarks[0].x).toBe(0.5);
    expect(frame?.landmarks[0].y).toBe(0.2);
    expect(frame?.landmarks[31].x).toBe(0.4);
    expect(frame?.landmarks[32].x).toBe(0.6);
  });

  it('handles missing pose result or empty landmarks by returning null', () => {
    expect(serializePoseResult(null, 1000, 0)).toBeNull();
    expect(serializePoseResult(undefined, 1000, 0)).toBeNull();
    expect(serializePoseResult({ landmarks: [], worldLandmarks: [] }, 1000, 0)).toBeNull();
    expect(serializePoseResult({ landmarks: [[]], worldLandmarks: [] }, 1000, 0)).toBeNull();
  });

  it('sanitizes non-finite or invalid numeric values', () => {
    const rawLandmarks = generateMockLandmarks(33);
    rawLandmarks[0] = { x: NaN, y: 0.5, z: Infinity, visibility: 1.5, presence: -0.5 };

    const mockResult = { landmarks: [rawLandmarks], worldLandmarks: [] };
    const frame = serializePoseResult(mockResult, 2000, 2);

    expect(frame).not.toBeNull();
    const sanitized0 = frame?.landmarks[0];
    expect(sanitized0?.x).toBe(0); // Sanitized NaN -> 0
    expect(sanitized0?.y).toBe(0.5);
    expect(sanitized0?.z).toBeUndefined(); // Non-finite z ignored
    expect(sanitized0?.visibility).toBe(1.0); // Clamped to [0, 1]
    expect(sanitized0?.presence).toBe(0.0); // Clamped to [0, 1]
  });

  it('handles optional fields gracefully (undefined z or visibility)', () => {
    const rawLandmark = { x: 0.3, y: 0.4 };
    const sanitized = sanitizeLandmark(rawLandmark);
    expect(sanitized.x).toBe(0.3);
    expect(sanitized.y).toBe(0.4);
    expect(sanitized.z).toBeUndefined();
    expect(sanitized.visibility).toBeUndefined();
    expect(sanitized.presence).toBeUndefined();
  });

  it('supports single-person selection policy when multiple people are detected', () => {
    const person0 = generateMockLandmarks(33, 0.9);
    person0[0] = { x: 0.2, y: 0.2, z: 0, visibility: 0.9, presence: 0.95 };

    const person1 = generateMockLandmarks(33, 0.7);
    person1[0] = { x: 0.8, y: 0.8, z: 0, visibility: 0.7, presence: 0.95 };

    const mockMultiResult = {
      landmarks: [person0, person1],
      worldLandmarks: [],
    };

    // Default policy: selects person 0
    const framePerson0 = serializePoseResult(mockMultiResult, 3000, 0);
    expect(framePerson0?.landmarks[0].x).toBe(0.2);

    // Explicit selection: person 1
    const framePerson1 = serializePoseResult(mockMultiResult, 3000, 0, { personIndex: 1 });
    expect(framePerson1?.landmarks[0].x).toBe(0.8);
  });

  it('reflects partial body visibility without discarding valid landmarks', () => {
    const landmarks = generateMockLandmarks(33, 0.9);
    // Lower limb landmarks (25-32) occluded/off-screen (visibility 0.1)
    for (let i = 25; i <= 32; i++) {
      landmarks[i].visibility = 0.1;
    }

    const mockResult = { landmarks: [landmarks], worldLandmarks: [] };
    const frame = serializePoseResult(mockResult, 4000, 1, { minVisibility: 0.5 });

    expect(frame).not.toBeNull();
    // Only 25 landmarks (0..24) meet minVisibility threshold of 0.5
    expect(frame?.quality.validLandmarkCount).toBe(25);
    expect(frame?.quality.expectedLandmarkCount).toBe(33);
    // All 33 landmarks remain in the array so landmark indexing is preserved
    expect(frame?.landmarks.length).toBe(33);
  });
});

describe('Milestone B: Rolling Sequence Buffer', () => {
  it('appends frames and tracks chronological duration & stats', () => {
    const buffer = new PoseSequenceBuffer({ maxDurationMs: 5000, maxFrameCount: 100 });
    expect(buffer.isEmpty()).toBe(true);

    buffer.push(createMockPoseFrame(1000, 0));
    buffer.push(createMockPoseFrame(1033, 1));
    buffer.push(createMockPoseFrame(1066, 2));

    const stats = buffer.getStats();
    expect(stats.frameCount).toBe(3);
    expect(stats.oldestTimestampMs).toBe(1000);
    expect(stats.newestTimestampMs).toBe(1066);
    expect(stats.retainedDurationMs).toBe(66);
    expect(stats.droppedFrameCount).toBe(0);
    expect(buffer.isEmpty()).toBe(false);
  });

  it('evicts oldest frames when maxFrameCount is exceeded (FIFO bound)', () => {
    const maxFrames = 5;
    const buffer = new PoseSequenceBuffer({ maxDurationMs: 60000, maxFrameCount: maxFrames });

    for (let i = 0; i < 10; i++) {
      buffer.push(createMockPoseFrame(1000 + i * 100, i));
    }

    const stats = buffer.getStats();
    expect(stats.frameCount).toBe(maxFrames);
    expect(stats.droppedFrameCount).toBe(5);
    expect(stats.oldestTimestampMs).toBe(1500); // 10 - 5 = starts at frame 5 (timestamp 1500)
    expect(stats.newestTimestampMs).toBe(1900);
  });

  it('evicts oldest frames when maxDurationMs is exceeded', () => {
    const buffer = new PoseSequenceBuffer({ maxDurationMs: 1000, maxFrameCount: 1000 });

    buffer.push(createMockPoseFrame(1000, 0));
    buffer.push(createMockPoseFrame(1500, 1));
    buffer.push(createMockPoseFrame(2200, 2)); // 2200 - 1000 = 1200 > 1000ms -> frame 0 evicted

    const stats = buffer.getStats();
    expect(stats.frameCount).toBe(2);
    expect(stats.oldestTimestampMs).toBe(1500);
    expect(stats.newestTimestampMs).toBe(2200);
    expect(stats.retainedDurationMs).toBe(700);
    expect(stats.droppedFrameCount).toBe(1);
  });

  it('calculates average frame cadence (FPS) accurately', () => {
    const buffer = new PoseSequenceBuffer({ maxDurationMs: 5000, maxFrameCount: 100 });
    // 31 frames spanning 1000ms = 30 FPS
    for (let i = 0; i <= 30; i++) {
      buffer.push(createMockPoseFrame(1000 + i * (1000 / 30), i));
    }

    const stats = buffer.getStats();
    expect(stats.frameCount).toBe(31);
    expect(stats.averageFps).toBe(30);
  });

  it('guarantees snapshot immutability', () => {
    const buffer = new PoseSequenceBuffer({ maxDurationMs: 5000, maxFrameCount: 10 });
    buffer.push(createMockPoseFrame(1000, 0));
    buffer.push(createMockPoseFrame(1050, 1));

    const snapshot = buffer.getSnapshot();
    expect(snapshot.length).toBe(2);

    // Mutating buffer afterwards must not change the returned snapshot array
    buffer.push(createMockPoseFrame(1100, 2));
    expect(snapshot.length).toBe(2);
    expect(buffer.getSnapshot().length).toBe(3);

    // Clearing buffer must not affect existing snapshot
    buffer.clear();
    expect(snapshot.length).toBe(2);
    expect(buffer.isEmpty()).toBe(true);
  });

  it('tracks no-pose frames without storing null objects', () => {
    const buffer = new PoseSequenceBuffer();
    buffer.push(createMockPoseFrame(1000, 0));
    buffer.recordNoPoseFrame();
    buffer.recordNoPoseFrame();
    buffer.push(createMockPoseFrame(1100, 1));

    const stats = buffer.getStats();
    expect(stats.frameCount).toBe(2);
    expect(stats.noPoseFrameCount).toBe(2);
  });

  it('resets capture session with a new captureId', () => {
    const buffer = new PoseSequenceBuffer();
    const id1 = buffer.getCaptureId();
    buffer.push(createMockPoseFrame(1000, 0));

    buffer.reset();
    const id2 = buffer.getCaptureId();

    expect(id1).not.toBe(id2);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.getStats().frameCount).toBe(0);
  });
});

describe('Milestone B: Pose Sequence Serialization & Export', () => {
  it('converts buffer snapshot into a valid PoseSequence conforming to schema v1.0.0', () => {
    const buffer = new PoseSequenceBuffer();
    buffer.push(createMockPoseFrame(1000, 0));
    buffer.push(createMockPoseFrame(1033, 1));

    const sequence = buffer.toSequence({ notes: 'Test session walking' });

    expect(sequence.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(typeof sequence.captureId).toBe('string');
    expect(sequence.frames.length).toBe(2);
    expect(sequence.metadata.notes).toBe('Test session walking');
    expect(sequence.metadata.poseSdk).toBe('@mediapipe/tasks-vision@1.2.3');
    expect(sequence.metadata.totalFrames).toBe(2);
    expect(typeof sequence.startedAt).toBe('string');
    expect(typeof sequence.endedAt).toBe('string');
  });

  it('serializes sequence to formatted JSON without video/binary data', () => {
    const buffer = new PoseSequenceBuffer();
    buffer.push(createMockPoseFrame(1000, 0));
    const sequence = buffer.toSequence();

    const jsonStr = serializeSequenceToJson(sequence);
    expect(typeof jsonStr).toBe('string');

    const parsed = JSON.parse(jsonStr);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.frames.length).toBe(1);
    expect(parsed.frames[0].landmarks.length).toBe(33);

    // Verify privacy invariant: no image or video data keys
    expect(parsed.video).toBeUndefined();
    expect(parsed.image).toBeUndefined();
    expect(parsed.rawPixels).toBeUndefined();
  });

  it('rejects exporting an empty sequence with a clear error', () => {
    const emptySequence = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      captureId: 'test-empty',
      startedAt: new Date().toISOString(),
      frames: [],
      metadata: {
        poseSdk: '@mediapipe/tasks-vision',
        coordinateConvention: 'normalized',
      },
    };

    const result = downloadSequenceAsJson(emptySequence);
    expect(result.success).toBe(false);
    expect(result.error ?? '').toMatch(/empty pose sequence/i);
  });
});
