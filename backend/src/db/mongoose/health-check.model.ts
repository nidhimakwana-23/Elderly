import mongoose, { Schema, type Document } from 'mongoose';
import type { HealthCheck } from '../../health-check/health-check.types.js';

// Define the interface for the Document
export interface IHealthCheckDocument extends Omit<HealthCheck, 'id'>, Document<string> {}

// Create the Mongoose Schema
const HealthCheckSchema = new Schema<IHealthCheckDocument>(
  {
    _id: { type: String, required: true },
    patient_id: { type: String, required: true, index: true },
    recorded_by_id: { type: String, required: false },
    sugar_level: { type: Number, required: false },
    weight: { type: Number, required: false },
    blood_pressure: { type: String, required: false },
    blood_level: { type: String, required: false },
    bmi: { type: Number, required: false },
    date: { type: String, required: true },
    notes: { type: String, required: false },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  {
    timestamps: false, // We handle created_at/updated_at manually as ISO strings
    _id: false, // We will manually supply the _id (as a UUID)
  }
);

export const HealthCheckModel = mongoose.model<IHealthCheckDocument>('HealthCheck', HealthCheckSchema);
