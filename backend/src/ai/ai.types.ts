import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const AiChatRequestSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;
