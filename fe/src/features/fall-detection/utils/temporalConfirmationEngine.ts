/**
 * Temporal Fall Confirmation Engine
 * Implements temporal filtering, consecutive vote accumulation, and the fall confirmation state machine.
 */

import type {
  DecisionResult,
  FallMonitoringState,
  InferencePredictionResponse,
  TemporalEngineConfig,
} from '../types/fall-detection.types';

export const DEFAULT_TEMPORAL_CONFIG: TemporalEngineConfig = {
  optimalThreshold: 0.1, // Aligned with model optimal_threshold in metadata.json
  consecutiveRequired: 2, // At least 2 consecutive high-risk windows
  windowDurationMs: 2500,
  minFramesPerWindow: 25,
  strideMs: 500,
  cooldownMs: 15000, // 15 seconds cooldown
  userResponseTimeoutMs: 15000, // 15 seconds for user confirmation
  missingPoseToleranceMs: 3000,
};

export class TemporalConfirmationEngine {
  private config: TemporalEngineConfig;
  private state: FallMonitoringState = 'idle';
  private consecutiveCount: number = 0;
  private lastCandidateMs: number = 0;
  private cooldownUntilMs: number = 0;
  private lastFallScore: number = 0;

  constructor(config: Partial<TemporalEngineConfig> = {}) {
    this.config = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  }

  public get currentState(): FallMonitoringState {
    return this.state;
  }

  public get currentConsecutiveCount(): number {
    return this.consecutiveCount;
  }

  public get lastScore(): number {
    return this.lastFallScore;
  }

  public startMonitoring(): void {
    this.state = 'monitoring';
    this.consecutiveCount = 0;
    this.lastCandidateMs = 0;
  }

  public stopMonitoring(): void {
    this.state = 'idle';
    this.consecutiveCount = 0;
  }

  /**
   * Process a single inference result from the ML model.
   */
  public processPrediction(
    prediction: InferencePredictionResponse,
    nowMs: number = Date.now()
  ): DecisionResult {
    // Check if in cooldown
    if (this.state === 'cooldown') {
      if (nowMs >= this.cooldownUntilMs) {
        this.state = 'monitoring';
        this.consecutiveCount = 0;
        return { action: 'cooldown_ended', state: 'monitoring' };
      }
      return { action: 'none', state: 'cooldown' };
    }

    // If an incident is already awaiting user or caregiver action, don't trigger new confirmations
    if (this.state === 'suspected_fall' || this.state === 'awaiting_response' || this.state === 'alert_sent') {
      return { action: 'none', state: this.state };
    }

    // If prediction is invalid (e.g. low visibility / insufficient landmarks)
    if (!prediction.is_valid) {
      if (this.state === 'candidate') {
        // If missing pose persists longer than tolerance, reset candidate
        if (nowMs - this.lastCandidateMs > this.config.missingPoseToleranceMs) {
          this.state = 'monitoring';
          this.consecutiveCount = 0;
          return { action: 'reset', state: 'monitoring', reason: 'missing_pose_timeout' };
        }
      }
      // Hold state during momentary data gap
      return { action: 'none', state: this.state };
    }

    this.lastFallScore = prediction.fall_score;

    // Check against operating threshold
    if (prediction.fall_score >= this.config.optimalThreshold) {
      this.consecutiveCount += 1;
      this.lastCandidateMs = nowMs;

      if (this.consecutiveCount >= this.config.consecutiveRequired) {
        this.state = 'suspected_fall';
        return {
          action: 'fall_confirmed',
          state: 'suspected_fall',
          score: prediction.fall_score,
          reason: `Confirmed after ${this.consecutiveCount} consecutive windows exceeding threshold ${this.config.optimalThreshold}`,
        };
      }

      this.state = 'candidate';
      return {
        action: 'candidate_detected',
        state: 'candidate',
        score: prediction.fall_score,
        reason: `Candidate window detected with score ${prediction.fall_score}`,
      };
    }

    // Normal movement detected
    if (this.state === 'candidate') {
      this.consecutiveCount = 0;
      this.state = 'monitoring';
      return { action: 'reset', state: 'monitoring', reason: 'normal_movement_restored' };
    }

    this.consecutiveCount = 0;
    return { action: 'none', state: 'monitoring', score: prediction.fall_score };
  }

  /**
   * Handle elderly user action or timeout on suspected fall.
   */
  public handleUserDecision(
    decision: 'okay' | 'need_help' | 'timeout',
    nowMs: number = Date.now()
  ): DecisionResult {
    if (decision === 'okay') {
      // User cancelled - false alarm
      this.state = 'cooldown';
      this.cooldownUntilMs = nowMs + this.config.cooldownMs;
      this.consecutiveCount = 0;
      return { action: 'reset', state: 'cooldown', reason: 'user_indicated_okay' };
    }

    // User confirmed help or timed out
    this.state = 'alert_sent';
    this.consecutiveCount = 0;
    return {
      action: 'fall_confirmed',
      state: 'alert_sent',
      reason: decision === 'need_help' ? 'user_requested_help' : 'user_response_timeout',
    };
  }

  /**
   * Set the state directly to awaiting_response (e.g. while dialog is open)
   */
  public setAwaitingResponse(): void {
    this.state = 'awaiting_response';
  }

  /**
   * Enter cooldown period to prevent duplicate triggers
   */
  public enterCooldown(nowMs: number = Date.now()): void {
    this.state = 'cooldown';
    this.cooldownUntilMs = nowMs + this.config.cooldownMs;
    this.consecutiveCount = 0;
  }

  public reset(): void {
    this.state = 'idle';
    this.consecutiveCount = 0;
    this.lastCandidateMs = 0;
    this.cooldownUntilMs = 0;
    this.lastFallScore = 0;
  }
}
