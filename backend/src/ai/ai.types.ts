import { z } from 'zod';

// ─── Chat message ─────────────────────────────────────────────────────────────
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Chat request (chat endpoint) ─────────────────────────────────────────────
export const AiChatRequestSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
  /** Existing session to append to. If omitted the turn is not persisted. */
  sessionId: z.string().optional(),
});

export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

// ─── Stored conversation message (includes timestamp) ─────────────────────────
export const StoredMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(), // ISO 8601
});

export type StoredMessage = z.infer<typeof StoredMessageSchema>;

// ─── Conversation session ─────────────────────────────────────────────────────
export const ConversationSessionSchema = z.object({
  id:        z.string(),
  userId:    z.string(),
  patientId: z.string(),
  title:     z.string(),
  messages:  z.array(StoredMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConversationSession = z.infer<typeof ConversationSessionSchema>;

// ─── Create session request ───────────────────────────────────────────────────
export const CreateSessionRequestSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// ─── Update session title request ─────────────────────────────────────────────
export const UpdateSessionTitleRequestSchema = z.object({
  title: z.string().min(1, 'title is required'),
});

export type UpdateSessionTitleRequest = z.infer<typeof UpdateSessionTitleRequestSchema>;

