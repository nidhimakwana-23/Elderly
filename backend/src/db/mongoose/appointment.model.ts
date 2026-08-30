import mongoose, { Schema, type Document } from 'mongoose';
import type { Appointment } from '../../appointment/appointment.types';

export interface AppointmentDocument extends Omit<Appointment, 'id'>, Document {}

const AppointmentSchema = new Schema(
  {
    id:                { type: String, required: true, unique: true, index: true },
    patient_id:        { type: String, required: true, index: true },
    doctor_profile_id: { type: String, required: true, index: true },
    slot_id:           { type: String, required: true },
    date:              { type: String, required: true },
    status:            { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    mode:              { type: String, enum: ['in-person', 'video', 'phone'], required: true },
    notes:             { type: String },
    created_at:        { type: String, required: true },
    updated_at:        { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

export const AppointmentModel = mongoose.model<AppointmentDocument>('Appointment', AppointmentSchema);
