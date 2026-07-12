import mongoose, { Schema, type Document } from 'mongoose';
import type { User } from '../../auth/auth.types.js';

/**
 * UserDocument — Mongoose document shape for a User.
 *
 * We extend the plain domain `User` type (minus `id` which Document provides)
 * so the schema stays in sync with the domain automatically.
 */
export interface UserDocument extends Omit<User, 'id'>, Document {}

// Use an untyped schema definition so we can declare `id` explicitly
// alongside Mongoose's own `_id`. The `id` field holds the app-level UUID.
const UserSchema = new Schema(
  {
    id:           { type: String, required: true, unique: true, index: true },
    fullName:     { type: String, required: true },
    birthdate:    { type: String, required: true },
    email:        { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt:    { type: String, required: true },
    role:         { type: String, enum: ['normal', 'family'], default: 'normal' },
  },
  {
    // Disable Mongoose's own timestamps — the service layer sets createdAt.
    timestamps: false,
    // Strip __v from toObject / toJSON output.
    versionKey: false,
  }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
