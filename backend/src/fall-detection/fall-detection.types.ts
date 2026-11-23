import { z } from 'zod';
import { FALL_EVENT_STATUSES, FALL_SEVERITY_LEVELS, FALL_NOTIFICATION_TYPES } from './fall-detection.constants';

export const FallSeveritySchema = z.enum(FALL_SEVERITY_LEVELS);
export type FallSeverity = z.infer<typeof FallSeveritySchema>;

export const FallStatusSchema = z.enum(FALL_EVENT_STATUSES);
export type FallStatus = z.infer<typeof FallStatusSchema>;

export const FallWindowSchema = z.object({
  start_ms: z.number().nullable().optional(),
  end_ms: z.number().nullable().optional(),
});
export type FallWindow = z.infer<typeof FallWindowSchema>;

export const FallEventSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  status: FallStatusSchema,
  severity: FallSeveritySchema,
  fall_score: z.number(),
  model_version: z.string(),
  window: FallWindowSchema,
  detected_at: z.string(),
  acknowledged_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  false_alarm_at: z.string().nullable().optional(),
  acknowledged_by: z.string().nullable().optional(),
  resolved_by: z.string().nullable().optional(),
  description: z.string().optional(),
  patient_name: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type FallEvent = z.infer<typeof FallEventSchema>;

export const CreateFallEventDtoSchema = z.object({
  patient_id: z.string().optional(),
  fall_score: z.number().min(0).max(1),
  severity: FallSeveritySchema.default('high'),
  model_version: z.string().default('1.0.0'),
  window: FallWindowSchema.optional(),
  detected_at: z.string().optional(),
  description: z.string().optional(),
});
export type CreateFallEventDto = z.input<typeof CreateFallEventDtoSchema>;

export const FallNotificationSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  patient_id: z.string(),
  event_id: z.string(),
  type: z.enum(FALL_NOTIFICATION_TYPES),
  title: z.string(),
  message: z.string(),
  status: z.enum(['unread', 'read']),
  created_at: z.string(),
  read_at: z.string().nullable().optional(),
});
export type FallNotification = z.infer<typeof FallNotificationSchema>;

export const InferenceLandmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().nullable().optional(),
  visibility: z.number().nullable().optional(),
});

export const InferenceFrameSchema = z.object({
  timestampMs: z.number(),
  frameIndex: z.number(),
  landmarks: z.array(InferenceLandmarkSchema),
  quality: z.object({
    poseDetected: z.boolean(),
    validLandmarkCount: z.number(),
    expectedLandmarkCount: z.number().default(33),
  }),
});

export const PredictRequestSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  frames: z.array(InferenceFrameSchema),
});
export type PredictRequest = z.infer<typeof PredictRequestSchema>;
