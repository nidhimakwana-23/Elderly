export const FALL_EVENT_STATUSES = [
  'suspected',
  'awaiting_response',
  'acknowledged',
  'resolved',
  'false_alarm',
] as const;

export const FALL_SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;

export const FALL_NOTIFICATION_TYPES = ['fall_detected', 'fall_escalated'] as const;

export const DEFAULT_INFERENCE_SERVICE_URL = process.env['INFERENCE_SERVICE_URL'] || 'http://127.0.0.1:8000';
