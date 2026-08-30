import mongoose, { Schema, type Document } from 'mongoose';
import type { EmergencyRequest } from '../../emergency/emergency.types';

export interface EmergencyDocument extends Omit<EmergencyRequest, 'id'>, Document {}

const EmergencySchema = new Schema(
  {
    id:                    { type: String, required: true, unique: true, index: true },
    patient_id:            { type: String, required: true, index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    description:           { type: String },
    status:                { type: String, enum: ['open', 'accepted', 'resolved', 'cancelled'], default: 'open', index: true },
    accepted_by_doctor_id: { type: String },
    accepted_at:           { type: String },
    resolved_at:           { type: String },
    created_at:            { type: String, required: true },
    updated_at:            { type: String, required: true },
    /** Soft-delete timestamp. Null/absent means the record is active. */
    deleted_at:            { type: String, default: null, index: { sparse: true } },
  },
  { timestamps: false, versionKey: false }
);

EmergencySchema.index({ location: '2dsphere' });

export const EmergencyModel = mongoose.model<EmergencyDocument>('EmergencyRequest', EmergencySchema);
