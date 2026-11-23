import mongoose, { Schema, type Document } from 'mongoose';
import type { FallNotification } from '../../fall-detection/fall-detection.types';
import { FALL_NOTIFICATION_TYPES } from '../../fall-detection/fall-detection.constants';

export interface FallNotificationDocument extends Omit<FallNotification, 'id'>, Document {}

const FallNotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    recipient_id: { type: String, required: true, index: true },
    patient_id: { type: String, required: true, index: true },
    event_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: FALL_NOTIFICATION_TYPES,
      default: 'fall_detected',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
      index: true,
    },
    created_at: { type: String, required: true },
    read_at: { type: String, default: null },
  },
  {
    collection: 'fallnotifications',
    timestamps: false,
    versionKey: false,
  }
);

FallNotificationSchema.index({ recipient_id: 1, status: 1, created_at: -1 });

export const FallNotificationModel = mongoose.model<FallNotificationDocument>(
  'FallNotification',
  FallNotificationSchema
);
