import {
  CURRENT_SCHEMA_VERSION,
  type BufferConfig,
  type BufferStats,
  type PoseFrame,
  type PoseSequence,
  type PoseSequenceMetadata,
} from '../types/pose-sequence.types';

export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxDurationMs: 10000, // 10 seconds rolling window
  maxFrameCount: 300, // 300 frames (~10s at 30fps)
};

/**
 * In-memory bounded rolling sequence buffer for PoseFrames.
 * Ensures strict memory bounds through FIFO eviction based on duration and frame count.
 */
export class PoseSequenceBuffer {
  private frames: PoseFrame[] = [];
  private config: BufferConfig;
  private captureId: string;
  private sessionStartedAt: string;
  private sessionEndedAt: string | null = null;
  private droppedFrameCount: number = 0;
  private noPoseFrameCount: number = 0;

  constructor(config?: Partial<BufferConfig>, initialCaptureId?: string) {
    this.config = {
      maxDurationMs: config?.maxDurationMs ?? DEFAULT_BUFFER_CONFIG.maxDurationMs,
      maxFrameCount: config?.maxFrameCount ?? DEFAULT_BUFFER_CONFIG.maxFrameCount,
    };
    this.captureId = initialCaptureId ?? this.generateCaptureId();
    this.sessionStartedAt = new Date().toISOString();
  }

  private generateCaptureId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `cap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Append a new PoseFrame to the rolling buffer.
   * Evicts older frames when exceeding maxFrameCount or maxDurationMs.
   */
  public push(frame: PoseFrame): void {
    this.frames.push(frame);
    this.enforceCapacityBounds();
  }

  /**
   * Records a processed frame where no pose was detected.
   * Keeps track of gaps and non-detection cadence without fabricating landmarks.
   */
  public recordNoPoseFrame(): void {
    this.noPoseFrameCount++;
  }

  /**
   * Enforces bounded duration and maximum frame count limits.
   */
  private enforceCapacityBounds(): void {
    if (this.frames.length === 0) return;

    // 1. Evict by frame count limit
    while (this.frames.length > this.config.maxFrameCount) {
      this.frames.shift();
      this.droppedFrameCount++;
    }

    // 2. Evict by time window limit
    const newestTimestamp = this.frames[this.frames.length - 1].timestampMs;
    while (
      this.frames.length > 1 &&
      newestTimestamp - this.frames[0].timestampMs > this.config.maxDurationMs
    ) {
      this.frames.shift();
      this.droppedFrameCount++;
    }
  }

  /**
   * Returns a snapshot array of current frames.
   * Creates a shallow copy so modifications to the live buffer do not alter the snapshot.
   */
  public getSnapshot(): PoseFrame[] {
    return [...this.frames];
  }

  /**
   * Returns current buffer statistics and quality metrics.
   */
  public getStats(): BufferStats {
    const frameCount = this.frames.length;
    const oldestTimestampMs = frameCount > 0 ? this.frames[0].timestampMs : null;
    const newestTimestampMs =
      frameCount > 0 ? this.frames[frameCount - 1].timestampMs : null;
    const retainedDurationMs =
      oldestTimestampMs !== null && newestTimestampMs !== null
        ? Math.max(0, newestTimestampMs - oldestTimestampMs)
        : 0;

    let averageFps = 0;
    if (frameCount > 1 && retainedDurationMs > 0) {
      averageFps = Math.round(((frameCount - 1) / (retainedDurationMs / 1000)) * 10) / 10;
    }

    // Calculate mean landmark visibility across retained frames
    let totalVisibility = 0;
    let framesWithVisibility = 0;
    for (const frame of this.frames) {
      if (frame.quality.meanVisibility !== undefined) {
        totalVisibility += frame.quality.meanVisibility;
        framesWithVisibility++;
      }
    }
    const meanVisibility =
      framesWithVisibility > 0
        ? Math.round((totalVisibility / framesWithVisibility) * 100) / 100
        : 0;

    const countRatio = frameCount / this.config.maxFrameCount;
    const durationRatio =
      this.config.maxDurationMs > 0
        ? retainedDurationMs / this.config.maxDurationMs
        : 0;
    const capacityUtilizationRatio = Math.min(1.0, Math.max(countRatio, durationRatio));

    return {
      frameCount,
      maxFrameCapacity: this.config.maxFrameCount,
      retainedDurationMs,
      maxDurationMs: this.config.maxDurationMs,
      oldestTimestampMs,
      newestTimestampMs,
      droppedFrameCount: this.droppedFrameCount,
      noPoseFrameCount: this.noPoseFrameCount,
      averageFps,
      meanVisibility,
      capacityUtilizationRatio: Math.round(capacityUtilizationRatio * 100) / 100,
    };
  }

  /**
   * Finalizes the current capture session.
   */
  public stopSession(): void {
    if (!this.sessionEndedAt) {
      this.sessionEndedAt = new Date().toISOString();
    }
  }

  /**
   * Converts current snapshot into a formal PoseSequence document.
   */
  public toSequence(customMetadata?: Partial<PoseSequenceMetadata>): PoseSequence {
    const stats = this.getStats();
    const endedAt = this.sessionEndedAt ?? new Date().toISOString();

    const metadata: PoseSequenceMetadata = {
      poseSdk: '@mediapipe/tasks-vision@1.2.3',
      poseModelVersion: 'pose_landmarker_lite.task',
      coordinateConvention: 'normalized [0, 1] relative to video frame; origin top-left; depth z relative to hips',
      captureCadenceFps: stats.averageFps,
      durationMs: stats.retainedDurationMs,
      totalFrames: stats.frameCount,
      exportedAt: new Date().toISOString(),
      ...customMetadata,
    };

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      captureId: this.captureId,
      startedAt: this.sessionStartedAt,
      endedAt,
      frames: this.getSnapshot(),
      metadata,
    };
  }

  /**
   * Empties the buffer and resets eviction counters.
   */
  public clear(): void {
    this.frames = [];
    this.droppedFrameCount = 0;
    this.noPoseFrameCount = 0;
    this.sessionEndedAt = null;
  }

  /**
   * Starts a brand new capture session with a fresh captureId and timestamp.
   */
  public reset(newCaptureId?: string): void {
    this.clear();
    this.captureId = newCaptureId ?? this.generateCaptureId();
    this.sessionStartedAt = new Date().toISOString();
    this.sessionEndedAt = null;
  }

  public getCaptureId(): string {
    return this.captureId;
  }

  public isEmpty(): boolean {
    return this.frames.length === 0;
  }
}
