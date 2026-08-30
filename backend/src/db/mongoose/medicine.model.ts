import mongoose, { Schema, type Document } from 'mongoose';
import type { Medicine } from '../../medicine/medicine.types';

/**
 * MedicineDocument — Mongoose document shape for a Medicine.
 */
export interface MedicineDocument extends Omit<Medicine, 'id'>, Document {}

const MedicineSchema = new Schema(
  {
    id:                  { type: String, required: true, unique: true, index: true },
    patient_id:          { type: String, required: true, index: true },
    medicine_name:       { type: String, required: true },
    medicine_type: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Other'],
      required: true,
    },
    dosage:              { type: String, required: true },
    strength:            { type: String },
    frequency: {
      type: String,
      enum: [
        'Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily',
        'Every 6 Hours', 'Weekly', 'Custom',
      ],
      required: true,
    },
    timing:              { type: [String], required: true, default: [] },
    start_date:          { type: String, required: true },
    end_date:            { type: String },
    reminder_enabled:    { type: Boolean, required: true, default: false },
    reminder_times:      { type: [String], required: true, default: [] },
    quantity:            { type: Number },
    doctor_name:         { type: String },
    prescription_number: { type: String },
    notes:               { type: String },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Upcoming', 'Expired'],
      required: true,
    },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
    /** Soft-delete timestamp. Null/absent means the record is active. */
    deleted_at: { type: String, default: null, index: { sparse: true } },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MedicineModel = mongoose.model<MedicineDocument>('Medicine', MedicineSchema);
