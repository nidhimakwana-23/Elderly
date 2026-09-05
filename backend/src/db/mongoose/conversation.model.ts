import mongoose, { Schema, type Document } from 'mongoose';
import type { ConversationSession } from '../../ai/ai.types';

/**
 * StoredMessage — a single turn in a conversation (user or assistant).
 */
export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
}

/**
 * ConversationSessionDocument — Mongoose document shape for a ConversationSession.
 */
export interface ConversationSessionDocument
  extends Omit<ConversationSession, 'id'>,
    Document {}

const StoredMessageSchema = new Schema<StoredMessage>(
  {
    role:      { type: String, enum: ['user', 'assistant'], required: true },
    content:   { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false, versionKey: false },
);

const ConversationSessionSchema = new Schema(
  {
    id:        { type: String, required: true, unique: true, index: true },
    userId:    { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    /** Auto-generated from the first user message (first 60 characters). */
    title:     { type: String, required: true },
    messages:  { type: [StoredMessageSchema], required: true, default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

export const ConversationSessionModel = mongoose.model<ConversationSessionDocument>(
  'ConversationSession',
  ConversationSessionSchema,
);
