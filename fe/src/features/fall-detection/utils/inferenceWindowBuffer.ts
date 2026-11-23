/**
 * Dedicated rolling buffer for real-time ML fall inference.
 * Maintains a temporal sliding window conforming to the 2.5-second classifier window.
 */

import type { PoseFrame } from '../types/pose-sequence.types';

export interface InferenceBufferOptions {
  windowDurationMs?: number; // Target window duration (default: 2500ms)
  maxRetentionMs?: number;   // Maximum historical buffer retention (default: 6000ms)
  minFramesPerWindow?: number; // Minimum valid frames required (default: 25)
  strideMs?: number;         // Minimum interval between inferences (default: 500ms)
}

export class InferenceWindowBuffer {
  private frames: PoseFrame[] = [];
  private readonly windowDurationMs: number;
  private readonly maxRetentionMs: number;
  private readonly minFramesPerWindow: number;
  private readonly strideMs: number;
  private lastExtractedMs: number = 0;

  constructor(options: InferenceBufferOptions = {}) {
    this.windowDurationMs = options.windowDurationMs ?? 2500;
    this.maxRetentionMs = options.maxRetentionMs ?? 6000;
    this.minFramesPerWindow = options.minFramesPerWindow ?? 25;
    this.strideMs = options.strideMs ?? 500;
  }

  /**
   * Append a single serialized pose frame to the rolling buffer.
   * Automatically evicts frames exceeding the max retention window.
   */
  public pushFrame(frame: PoseFrame): void {
    if (!frame || !Array.isArray(frame.landmarks)) return;

    this.frames.push(frame);

    // Evict frames older than (latestTimestamp - maxRetentionMs)
    const latestTimestamp = frame.timestampMs;
    const cutoffTimestamp = latestTimestamp - this.maxRetentionMs;

    while (this.frames.length > 0 && this.frames[0].timestampMs < cutoffTimestamp) {
      this.frames.shift();
    }
  }

  /**
   * Check if the buffer has enough chronological data and sufficient stride time has elapsed.
   */
  public isReadyForInference(): boolean {
    if (this.frames.length < this.minFramesPerWindow) {
      return false;
    }

    const latestFrame = this.frames[this.frames.length - 1];
    const oldestFrame = this.frames[0];
    const currentDuration = latestFrame.timestampMs - oldestFrame.timestampMs;

    // Buffer must span at least the required window duration
    if (currentDuration < this.windowDurationMs) {
      return false;
    }

    // Must satisfy the temporal stride since last inference extraction
    if (this.lastExtractedMs > 0 && (latestFrame.timestampMs - this.lastExtractedMs) < this.strideMs) {
      return false;
    }

    return true;
  }

  /**
   * Extract the latest temporal window of frames spanning windowDurationMs.
   * Returns null if criteria are not met.
   */
  public extractWindow(): PoseFrame[] | null {
    if (!this.isReadyForInference()) {
      return null;
    }

    const latestFrame = this.frames[this.frames.length - 1];
    const windowStartMs = latestFrame.timestampMs - this.windowDurationMs;

    // Find all frames falling within [windowStartMs, latestFrame.timestampMs]
    const windowFrames = this.frames.filter((f) => f.timestampMs >= windowStartMs);

    if (windowFrames.length < this.minFramesPerWindow) {
      return null;
    }

    this.lastExtractedMs = latestFrame.timestampMs;

    // Return a shallow copy of frames array
    return [...windowFrames];
  }

  /**
   * Clear all buffered frames and reset stride tracker.
   */
  public reset(): void {
    this.frames = [];
    this.lastExtractedMs = 0;
  }

  public get frameCount(): number {
    return this.frames.length;
  }

  public get durationMs(): number {
    if (this.frames.length < 2) return 0;
    return this.frames[this.frames.length - 1].timestampMs - this.frames[0].timestampMs;
  }
}
