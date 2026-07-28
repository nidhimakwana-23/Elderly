import mongoose, { Schema, type Document } from 'mongoose';
import type { FamilyProfile } from '../../family/family.types.js';

/**
 * FamilyProfileDocument — Mongoose document shape for a FamilyProfile.
 */
export interface FamilyProfileDocument extends Omit<FamilyProfile, 'id'>, Document {}

const FamilyProfileSchema = new Schema(
  {
    id:               { type: String, required: true, unique: true, index: true },
    userId:           { type: String, required: true, index: true },
    linkedToUserId:   { type: String, required: true, index: true },
    medicalCondition: { type: String, required: true },
    emergencyContacts: { type: [String], required: true, default: [] },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const FamilyProfileModel = mongoose.model<FamilyProfileDocument>(
  'FamilyProfile',
  FamilyProfileSchema
);
