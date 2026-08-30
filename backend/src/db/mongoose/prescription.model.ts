import mongoose, { Schema, type Document } from 'mongoose';
import type { Prescription } from '../../prescription/prescription.types';

export interface PrescriptionDocument extends Omit<Prescription, 'id'>, Document {}


const MedicationItemSubSchema = new Schema(
  {
    name:         { type: String, required: true },
    dosage:       { type: String, required: true },
    frequency:    { type: String, required: true },
    duration:     { type: String, required: true },
    instructions: { type: String },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    id:             { type: String, required: true, unique: true, index: true },
    patient_id:     { type: String, required: true, index: true },
    doctor_id:      { type: String, required: true, index: true },
    appointment_id: { type: String },
    diagnosis:      { type: String, required: true },
    medications:    { type: [MedicationItemSubSchema], required: true },
    notes:          { type: String },
    issued_at:      { type: String, required: true },
    valid_until:    { type: String },
    created_at:     { type: String, required: true },
    updated_at:     { type: String, required: true },
    /** Soft-delete timestamp. Null/absent means the record is active. */
    deleted_at:     { type: String, default: null, index: { sparse: true } },
  },
  { timestamps: false, versionKey: false }
);

export const PrescriptionModel = mongoose.model<PrescriptionDocument>('Prescription', PrescriptionSchema);
