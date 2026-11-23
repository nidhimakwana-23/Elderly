/**
 * Milestone D: Real-Time Inference, Fall Confirmation, and Event Types
 */

export type FallMonitoringState =
  | 'idle'
  | 'monitoring'
  | 'candidate'
  | 'suspected_fall'
  | 'awaiting_response'
  | 'alert_sent'
  | 'cooldown';

export interface InferencePredictionResponse {
  label: 'fall' | 'normal' | null;
  fall_score: number;
  is_valid: boolean;
  reason: string | null;
  model_version: string;
  window: {
    start_ms: number | null;
    end_ms: number | null;
  };
}

export interface TemporalEngineConfig {
  /** Probability threshold from Milestone C (baseline: 0.1) */
  optimalThreshold: number;
  /** Number of consecutive high-probability predictions required to confirm fall */
  consecutiveRequired: number;
  /** Window duration in milliseconds (baseline: 2.5s = 2500ms) */
  windowDurationMs: number;
  /** Minimum valid frames per window */
  minFramesPerWindow: number;
  /** Evaluation stride in milliseconds (default: 500ms) */
  strideMs: number;
  /** Cooldown in ms after an alert or cancellation before new alerts can trigger */
  cooldownMs: number;
  /** Timeout in ms for elderly user to confirm before automatic escalation */
  userResponseTimeoutMs: number;
  /** Grace period for missing pose after a candidate fall */
  missingPoseToleranceMs: number;
}

export interface DecisionResult {
  action: 'none' | 'candidate_detected' | 'fall_confirmed' | 'reset' | 'cooldown_ended';
  state: FallMonitoringState;
  reason?: string;
  score?: number;
}

export interface FallEventRecord {
  id: string;
  patient_id: string;
  status: 'suspected' | 'awaiting_response' | 'acknowledged' | 'resolved' | 'false_alarm';
  severity: 'low' | 'medium' | 'high';
  fall_score: number;
  model_version: string;
  window: {
    start_ms?: number | null;
    end_ms?: number | null;
  };
  detected_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  false_alarm_at?: string | null;
  acknowledged_by?: string | null;
  resolved_by?: string | null;
  description?: string;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CaregiverNotification {
  id: string;
  recipient_id: string;
  patient_id: string;
  event_id: string;
  type: 'fall_detected' | 'fall_escalated';
  title: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  read_at?: string | null;
}

export interface InferenceStats {
  inferenceFps: number;
  lastLatencyMs: number;
  totalInferences: number;
  lastScore: number;
  isModelReady: boolean;
  modelVersion: string;
}
