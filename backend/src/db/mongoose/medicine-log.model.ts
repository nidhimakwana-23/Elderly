import mongoose, { Schema, type Document } from 'mongoose';
import type { MedicineLog } from '../../medicine-logs/medicine-logs.types';

/**
 * MedicineLogDocument — Mongoose document shape for a MedicineLog.
 *
 * All ID fields are plain strings (UUIDs) — Option A ID strategy.
 */
export interface MedicineLogDocument extends Omit<MedicineLog, 'id'>, Document {}

const MedicineLogSchema = new Schema(
  {
    id:            { type: String, required: true, unique: true, index: true },
    medicineId:    { type: String, required: true, index: true },
    elderlyId:     { type: String, required: true, index: true },
    medicineName:  { type: String, required: true },
    dosage:        { type: String, required: true },
    scheduledDate: { type: String, required: true, index: true },
    scheduledTime: { type: String, required: true },
    takenTime:     { type: String, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Taken', 'Skipped', 'Missed'],
      required: true,
      default: 'Pending',
    },
    skippedReason: { type: String },
    period: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
    },
    remarks:   { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    /** Soft-delete timestamp. Null/absent means the record is active. */
    deleted_at: { type: String, default: null, index: { sparse: true } },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MedicineLogModel = mongoose.model<MedicineLogDocument>(
  'MedicineLog',
  MedicineLogSchema
);
