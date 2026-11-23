import { describe, it, expect, beforeEach } from 'vitest';
import { InferenceWindowBuffer } from '../utils/inferenceWindowBuffer';
import { TemporalConfirmationEngine } from '../utils/temporalConfirmationEngine';
import type { PoseFrame, PoseLandmark } from '../types/pose-sequence.types';
import type { InferencePredictionResponse } from '../types/fall-detection.types';

function createDummyFrame(timestampMs: number, frameIndex: number, valid = true): PoseFrame {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5 + i * 0.001,
    y: 0.5,
    z: 0.0,
    visibility: valid ? 0.9 : 0.1,
  }));

  return {
    timestampMs,
    frameIndex,
    landmarks,
    quality: {
      poseDetected: valid,
      validLandmarkCount: valid ? 33 : 0,
      expectedLandmarkCount: 33,
    },
  };
}

describe('Milestone D: Real-Time Inference Window Buffer', () => {
  let buffer: InferenceWindowBuffer;

  beforeEach(() => {
    buffer = new InferenceWindowBuffer({
      windowDurationMs: 2500,
      maxRetentionMs: 5000,
      minFramesPerWindow: 25,
      strideMs: 500,
    });
  });

  it('rejects inference when buffer has fewer than minFramesPerWindow frames', () => {
    for (let i = 0; i < 20; i++) {
      buffer.pushFrame(createDummyFrame(1000 + i * 50, i));
    }
    expect(buffer.isReadyForInference()).toBe(false);
    expect(buffer.extractWindow()).toBeNull();
  });

  it('rejects inference when duration span is less than windowDurationMs', () => {
    // 30 frames spaced 20ms apart = 600ms (< 2500ms)
    for (let i = 0; i < 30; i++) {
      buffer.pushFrame(createDummyFrame(1000 + i * 20, i));
    }
    expect(buffer.isReadyForInference()).toBe(false);
  });

  it('extracts valid window when duration and frame count criteria are satisfied', () => {
    // 60 frames spaced 50ms apart = 3000ms duration (> 2500ms)
    for (let i = 0; i < 60; i++) {
      buffer.pushFrame(createDummyFrame(1000 + i * 50, i));
    }
    expect(buffer.isReadyForInference()).toBe(true);

    const window = buffer.extractWindow();
    expect(window).not.toBeNull();
    expect(window!.length).toBeGreaterThanOrEqual(25);

    const first = window![0];
    const last = window![window!.length - 1];
    expect(last.timestampMs - first.timestampMs).toBeLessThanOrEqual(2500);
  });

  it('throttles extraction according to strideMs', () => {
    for (let i = 0; i < 60; i++) {
      buffer.pushFrame(createDummyFrame(1000 + i * 50, i));
    }
    const firstExtract = buffer.extractWindow();
    expect(firstExtract).not.toBeNull();

    // Immediately attempting extraction before strideMs elapses should return null
    expect(buffer.isReadyForInference()).toBe(false);
    expect(buffer.extractWindow()).toBeNull();

    // Add frames advancing time past strideMs (500ms)
    const lastTime = 1000 + 59 * 50; // 3950
    for (let i = 1; i <= 12; i++) {
      buffer.pushFrame(createDummyFrame(lastTime + i * 50, 60 + i));
    }
    expect(buffer.isReadyForInference()).toBe(true);
    expect(buffer.extractWindow()).not.toBeNull();
  });

  it('evicts stale frames older than maxRetentionMs', () => {
    // Push frames from 0ms to 8000ms
    for (let i = 0; i <= 80; i++) {
      buffer.pushFrame(createDummyFrame(i * 100, i));
    }
    // With 5000ms max retention, oldest frame should be >= (8000 - 5000) = 3000ms
    expect(buffer.durationMs).toBeLessThanOrEqual(5100);
  });

  it('resets buffer completely', () => {
    for (let i = 0; i < 30; i++) {
      buffer.pushFrame(createDummyFrame(1000 + i * 50, i));
    }
    buffer.reset();
    expect(buffer.frameCount).toBe(0);
    expect(buffer.durationMs).toBe(0);
  });
});

describe('Milestone D: Temporal Fall Confirmation Engine', () => {
  let engine: TemporalConfirmationEngine;

  beforeEach(() => {
    engine = new TemporalConfirmationEngine({
      optimalThreshold: 0.1,
      consecutiveRequired: 2,
      cooldownMs: 10000,
      missingPoseToleranceMs: 2000,
    });
    engine.startMonitoring();
  });

  it('stays in monitoring when prediction fall score is below threshold', () => {
    const pred: InferencePredictionResponse = {
      label: 'normal',
      fall_score: 0.04,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
    };

    const res = engine.processPrediction(pred, 3500);
    expect(res.action).toBe('none');
    expect(res.state).toBe('monitoring');
    expect(engine.currentState).toBe('monitoring');
  });

  it('transitions to candidate on first high-risk prediction', () => {
    const pred: InferencePredictionResponse = {
      label: 'fall',
      fall_score: 0.85,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
    };

    const res = engine.processPrediction(pred, 3500);
    expect(res.action).toBe('candidate_detected');
    expect(res.state).toBe('candidate');
    expect(engine.currentState).toBe('candidate');
    expect(engine.currentConsecutiveCount).toBe(1);
  });

  it('confirms fall upon reaching required consecutive high-risk predictions', () => {
    const highPred: InferencePredictionResponse = {
      label: 'fall',
      fall_score: 0.88,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
    };

    // First high prediction -> candidate
    engine.processPrediction(highPred, 3500);

    // Second consecutive high prediction -> suspected_fall
    const res2 = engine.processPrediction(highPred, 4000);
    expect(res2.action).toBe('fall_confirmed');
    expect(res2.state).toBe('suspected_fall');
    expect(engine.currentState).toBe('suspected_fall');
  });

  it('resets candidate to monitoring when normal movement follows', () => {
    const highPred: InferencePredictionResponse = {
      label: 'fall',
      fall_score: 0.70,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
    };
    const normalPred: InferencePredictionResponse = {
      label: 'normal',
      fall_score: 0.02,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1500, end_ms: 4000 },
    };

    engine.processPrediction(highPred, 3500);
    expect(engine.currentState).toBe('candidate');

    const res = engine.processPrediction(normalPred, 4000);
    expect(res.action).toBe('reset');
    expect(res.state).toBe('monitoring');
    expect(engine.currentState).toBe('monitoring');
    expect(engine.currentConsecutiveCount).toBe(0);
  });

  it('does not classify person as safe simply because pose is missing or invalid', () => {
    const highPred: InferencePredictionResponse = {
      label: 'fall',
      fall_score: 0.90,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
    };
    const invalidPred: InferencePredictionResponse = {
      label: null,
      fall_score: 0.0,
      is_valid: false,
      reason: 'Insufficient landmarks',
      model_version: '1.0.0',
      window: { start_ms: null, end_ms: null },
    };

    engine.processPrediction(highPred, 3500);
    expect(engine.currentState).toBe('candidate');

    // A momentary invalid frame within tolerance keeps the candidate state
    const res = engine.processPrediction(invalidPred, 4000);
    expect(res.action).toBe('none');
    expect(engine.currentState).toBe('candidate');
  });

  it('enters cooldown on user "okay" decision and ignores alerts until cooldown expires', () => {
    engine.handleUserDecision('okay', 5000);
    expect(engine.currentState).toBe('cooldown');

    const highPred: InferencePredictionResponse = {
      label: 'fall',
      fall_score: 0.95,
      is_valid: true,
      reason: null,
      model_version: '1.0.0',
      window: { start_ms: 5500, end_ms: 8000 },
    };

    // Inside 10s cooldown (at 8000ms < 15000ms)
    const res = engine.processPrediction(highPred, 8000);
    expect(res.action).toBe('none');
    expect(res.state).toBe('cooldown');

    // After cooldown expires (at 16000ms >= 15000ms)
    const resAfter = engine.processPrediction(highPred, 16000);
    expect(resAfter.action).toBe('cooldown_ended');
    expect(engine.currentState).toBe('monitoring');
  });

  it('marks alert_sent when user confirms "need_help" or times out', () => {
    const res = engine.handleUserDecision('need_help', 5000);
    expect(res.action).toBe('fall_confirmed');
    expect(res.state).toBe('alert_sent');
    expect(engine.currentState).toBe('alert_sent');
  });
});
