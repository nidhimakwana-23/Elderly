import mongoose, { Schema, type Document } from 'mongoose';
import type { FallEvent } from '../../fall-detection/fall-detection.types';
import { FALL_EVENT_STATUSES, FALL_SEVERITY_LEVELS } from '../../fall-detection/fall-detection.constants';

export interface FallEventDocument extends Omit<FallEvent, 'id'>, Document {}

const FallEventSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    patient_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: FALL_EVENT_STATUSES,
      default: 'awaiting_response',
      index: true,
    },
    severity: {
      type: String,
      enum: FALL_SEVERITY_LEVELS,
      default: 'high',
    },
    fall_score: { type: Number, required: true },
    model_version: { type: String, required: true, default: '1.0.0' },
    window: {
      start_ms: { type: Number, default: null },
      end_ms: { type: Number, default: null },
    },
    detected_at: { type: String, required: true, index: true },
    acknowledged_at: { type: String, default: null },
    resolved_at: { type: String, default: null },
    false_alarm_at: { type: String, default: null },
    acknowledged_by: { type: String, default: null },
    resolved_by: { type: String, default: null },
    description: { type: String, default: 'Potential fall pattern detected.' },
    patient_name: { type: String, default: null },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  {
    collection: 'fallevents',
    timestamps: false,
    versionKey: false,
  }
);

FallEventSchema.index({ patient_id: 1, created_at: -1 });

export const FallEventModel = mongoose.model<FallEventDocument>(
  'FallEvent',
  FallEventSchema
);
