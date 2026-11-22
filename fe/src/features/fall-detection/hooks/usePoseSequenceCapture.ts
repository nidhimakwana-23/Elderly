import { useState, useRef, useCallback, useEffect } from 'react';
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  type BufferConfig,
  type BufferStats,
  type CaptureState,
  type PoseSequence,
} from '../types/pose-sequence.types';
import {
  DEFAULT_BUFFER_CONFIG,
  PoseSequenceBuffer,
} from '../utils/poseSequenceBuffer';
import { serializePoseResult } from '../utils/poseSerializer';
import { downloadSequenceAsJson, type ExportResult } from '../utils/poseExporter';

export interface UsePoseSequenceCaptureOptions {
  bufferConfig?: Partial<BufferConfig>;
  statsThrottleMs?: number;
}

export interface UsePoseSequenceCaptureResult {
  captureState: CaptureState;
  isRecording: boolean;
  canExport: boolean;
  bufferStats: BufferStats;
  captureId: string;
  startCapture: () => void;
  stopCapture: () => void;
  clearCapture: () => void;
  exportSequence: (notes?: string) => ExportResult;
  getSnapshotSequence: (notes?: string) => PoseSequence;
  ingestInferenceResult: (
    result: PoseLandmarkerResult | null | undefined,
    timestampMs: number,
  ) => void;
}

export function usePoseSequenceCapture(
  options?: UsePoseSequenceCaptureOptions,
): UsePoseSequenceCaptureResult {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');

  // Buffer instance held in ref to avoid re-instantiation across renders
  const bufferRef = useRef<PoseSequenceBuffer>(
    new PoseSequenceBuffer(options?.bufferConfig ?? DEFAULT_BUFFER_CONFIG),
  );

  const [bufferStats, setBufferStats] = useState<BufferStats>(() =>
    bufferRef.current.getStats(),
  );

  const frameIndexRef = useRef<number>(0);
  const lastStatsUpdateRef = useRef<number>(0);
  const statsThrottleMs = options?.statsThrottleMs ?? 250;

  // Sync stats into React state (throttled)
  const syncStats = useCallback((force = false) => {
    const now = performance.now();
    if (force || now - lastStatsUpdateRef.current >= statsThrottleMs) {
      setBufferStats(bufferRef.current.getStats());
      lastStatsUpdateRef.current = now;
    }
  }, [statsThrottleMs]);

  // Frame ingestion handler called directly from the inference loop
  const ingestInferenceResult = useCallback(
    (
      result: PoseLandmarkerResult | null | undefined,
      timestampMs: number,
    ) => {
      if (captureState !== 'recording') return;

      const frameIndex = frameIndexRef.current++;
      const frame = serializePoseResult(result, timestampMs, frameIndex);

      if (frame) {
        bufferRef.current.push(frame);
      } else {
        bufferRef.current.recordNoPoseFrame();
      }

      syncStats(false);
    },
    [captureState, syncStats],
  );

  const startCapture = useCallback(() => {
    if (captureState === 'stopped') {
      // Start a fresh session if restarting from stopped
      bufferRef.current.reset();
      frameIndexRef.current = 0;
    }
    setCaptureState('recording');
    syncStats(true);
  }, [captureState, syncStats]);

  const stopCapture = useCallback(() => {
    bufferRef.current.stopSession();
    setCaptureState('stopped');
    syncStats(true);
  }, [syncStats]);

  const clearCapture = useCallback(() => {
    bufferRef.current.clear();
    frameIndexRef.current = 0;
    setCaptureState('idle');
    syncStats(true);
  }, [syncStats]);

  const exportSequence = useCallback(
    (notes?: string): ExportResult => {
      const sequence = bufferRef.current.toSequence({ notes });
      return downloadSequenceAsJson(sequence);
    },
    [],
  );

  const getSnapshotSequence = useCallback(
    (notes?: string): PoseSequence => {
      return bufferRef.current.toSequence({ notes });
    },
    [],
  );

  // Sync final stats on unmount or state transition
  useEffect(() => {
    syncStats(true);
  }, [captureState, syncStats]);

  const isRecording = captureState === 'recording';
  const canExport = bufferStats.frameCount > 0;

  return {
    captureState,
    isRecording,
    canExport,
    bufferStats,
    captureId: bufferRef.current.getCaptureId(),
    startCapture,
    stopCapture,
    clearCapture,
    exportSequence,
    getSnapshotSequence,
    ingestInferenceResult,
  };
}
