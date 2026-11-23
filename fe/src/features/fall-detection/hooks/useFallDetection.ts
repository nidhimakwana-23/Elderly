/**
 * Hook for managing real-time ML fall detection inference and temporal confirmation.
 */

import { useState, useRef, useCallback } from 'react';
import { InferenceWindowBuffer } from '../utils/inferenceWindowBuffer';
import { TemporalConfirmationEngine } from '../utils/temporalConfirmationEngine';
import { fallDetectionApi } from '../services/fallDetectionApi';
import type { PoseFrame } from '../types/pose-sequence.types';
import type {
  FallMonitoringState,
  InferenceStats,
} from '../types/fall-detection.types';

interface UseFallDetectionProps {
  onPotentialFallDetected?: (score: number, window: { start_ms: number | null; end_ms: number | null }) => void;
  onStateChange?: (state: FallMonitoringState) => void;
}

export function useFallDetection({
  onPotentialFallDetected,
  onStateChange,
}: UseFallDetectionProps = {}) {
  const [monitoringState, setMonitoringState] = useState<FallMonitoringState>('idle');
  const [stats, setStats] = useState<InferenceStats>({
    inferenceFps: 0,
    lastLatencyMs: 0,
    totalInferences: 0,
    lastScore: 0,
    isModelReady: true,
    modelVersion: '1.0.0',
  });

  const bufferRef = useRef<InferenceWindowBuffer>(new InferenceWindowBuffer());
  const engineRef = useRef<TemporalConfirmationEngine>(new TemporalConfirmationEngine());
  const isInFlightRef = useRef<boolean>(false);
  const inferenceCountRef = useRef<number>(0);
  const lastInferenceTimeRef = useRef<number>(0);

  const updateState = useCallback(
    (newState: FallMonitoringState) => {
      setMonitoringState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  const startMonitoring = useCallback(() => {
    bufferRef.current.reset();
    engineRef.current.startMonitoring();
    updateState('monitoring');
  }, [updateState]);

  const stopMonitoring = useCallback(() => {
    bufferRef.current.reset();
    engineRef.current.stopMonitoring();
    updateState('idle');
  }, [updateState]);

  /**
   * Ingest a serialized pose frame from the live video pipeline.
   */
  const ingestPoseFrame = useCallback(
    async (frame: PoseFrame) => {
      const buffer = bufferRef.current;
      const engine = engineRef.current;

      buffer.pushFrame(frame);

      // Don't overlap inference requests or run if monitoring is idle
      if (engine.currentState === 'idle' || isInFlightRef.current) {
        return;
      }

      // Check if temporal window is ready for next stride
      if (!buffer.isReadyForInference()) {
        return;
      }

      const windowFrames = buffer.extractWindow();
      if (!windowFrames) return;

      isInFlightRef.current = true;
      const startTime = performance.now();

      try {
        const prediction = await fallDetectionApi.predictWindow(windowFrames);
        const endTime = performance.now();
        const latencyMs = Math.round(endTime - startTime);

        inferenceCountRef.current++;
        const now = performance.now();
        const elapsedSec = (now - lastInferenceTimeRef.current) / 1000;
        const currentFps = elapsedSec > 0 ? Math.round(1 / elapsedSec) : 0;
        lastInferenceTimeRef.current = now;

        setStats((prev) => ({
          ...prev,
          lastLatencyMs: latencyMs,
          totalInferences: inferenceCountRef.current,
          lastScore: prediction.fall_score,
          inferenceFps: currentFps,
          modelVersion: prediction.model_version || prev.modelVersion,
        }));

        // Evaluate prediction through temporal decision engine
        const decision = engine.processPrediction(prediction);

        if (decision.action === 'candidate_detected') {
          updateState('candidate');
        } else if (decision.action === 'fall_confirmed') {
          updateState('suspected_fall');
          onPotentialFallDetected?.(prediction.fall_score, prediction.window);
        } else if (decision.action === 'reset' || decision.action === 'cooldown_ended') {
          updateState(decision.state);
        }
      } catch (err) {
        console.warn('Inference request failed:', err);
      } finally {
        isInFlightRef.current = false;
      }
    },
    [onPotentialFallDetected, updateState]
  );

  return {
    monitoringState,
    stats,
    engine: engineRef.current,
    startMonitoring,
    stopMonitoring,
    ingestPoseFrame,
    setMonitoringState: updateState,
  };
}
