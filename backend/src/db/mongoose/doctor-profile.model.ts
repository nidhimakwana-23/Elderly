import mongoose, { Schema, type Document } from 'mongoose';
import type { DoctorProfile } from '../../doctor/doctor.types.js';

export interface DoctorProfileDocument extends Omit<DoctorProfile, 'id'>, Document {}

const SlotSubSchema = new Schema(
  {
    id:           { type: String, required: true },
    day_of_week:  { type: Number, required: true, min: 0, max: 6 },
    start_time:   { type: String, required: true },
    end_time:     { type: String, required: true },
    is_booked:    { type: Boolean, default: false },
  },
  { _id: false }
);

const DoctorProfileSchema = new Schema(
  {
    id:                         { type: String, required: true, unique: true, index: true },
    user_id:                    { type: String, required: true, unique: true, index: true },
    specialization:             { type: String, required: true },
    license_number:             { type: String, required: true },
    phone:                      { type: String, required: true },
    bio:                        { type: String },
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
    availability:               { type: [SlotSubSchema], default: [] },
    is_available_for_emergency: { type: Boolean, default: false },
    created_at:                 { type: String, required: true },
    updated_at:                 { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

// Required for $nearSphere / $geoWithin queries
DoctorProfileSchema.index({ location: '2dsphere' });

export const DoctorProfileModel = mongoose.model<DoctorProfileDocument>('DoctorProfile', DoctorProfileSchema);
