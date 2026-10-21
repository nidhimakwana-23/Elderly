/**
 * chatbot.types.ts
 *
 * Type contracts and Zod validation schemas for the chatbot intent-classification layer.
 * The ML model only ever receives the raw question text and returns
 * an intent label + confidence score. Patient medical data is NEVER
 * sent to the Python process.
 */

import { z } from 'zod';

// ── Known intents ──────────────────────────────────────────────────────────────
export const ChatbotIntentSchema = z.enum([
  'medicine_today',   // Did she take today's medicines?
  'medicine_missed',  // Which medicines were skipped/missed?
  'medicine_timing',  // Is she taking medicines on time?
  'medicine_pattern', // What is her overall adherence pattern?
  'sugar_trend',      // How has her blood sugar been?
  'bp_trend',         // How has her blood pressure been?
  'weight_trend',     // How has her weight changed?
  'health_summary',   // General recent health overview
  'unknown',         // Low-confidence / out-of-scope question
]);

export type ChatbotIntent = z.infer<typeof ChatbotIntentSchema>;

// ── Request / Response contracts ───────────────────────────────────────────────

/** Incoming request body schema for the chatbot intent endpoint. */
export const ChatbotIntentRequestSchema = z.object({
  /** The raw natural-language question from the user. */
  question: z.string().trim().min(1, 'Question must not be empty.'),
  /**
   * Optional patient ID.
   * When provided, the authenticated user's access to this patient is
   * verified before medical data is queried.
   */
  patientId: z.string().trim().min(1).optional(),
});

export type ChatbotIntentRequest = z.infer<typeof ChatbotIntentRequestSchema>;

/** Schema for validating the response returned by the Python ML classifier. */
export const IntentPredictionSchema = z.object({
  /** The predicted intent label. */
  intent: ChatbotIntentSchema,
  /** Probability of the predicted class (0 – 1). */
  confidence: z.number().min(0).max(1),
});

export type IntentPrediction = z.infer<typeof IntentPredictionSchema>;

/** The full chatbot API response sent back to the frontend. */
export const ChatbotResponseSchema = z.object({
  intent: ChatbotIntentSchema,
  confidence: z.number().min(0).max(1),
  /** Human-readable answer built from deterministic DB analytics. */
  answer: z.string(),
});

export type ChatbotResponse = z.infer<typeof ChatbotResponseSchema>;

// ── Type guard ─────────────────────────────────────────────────────────────────
const KNOWN_INTENTS: readonly ChatbotIntent[] = ChatbotIntentSchema.options;

/**
 * Validates that a raw string value is a known ChatbotIntent.
 * Used to reject unexpected values from the Python process output.
 */
export function isChatbotIntent(value: unknown): value is ChatbotIntent {
  return typeof value === 'string' && (KNOWN_INTENTS as readonly string[]).includes(value);
}
