/**
 * chatbot.types.ts
 *
 * Type contracts for the chatbot intent-classification layer.
 * The ML model only ever receives the raw question text and returns
 * an intent label + confidence score.  Patient medical data is NEVER
 * sent to the Python process.
 */

// ── Known intents ──────────────────────────────────────────────────────────────
export type ChatbotIntent =
  | 'medicine_today'   // Did she take today's medicines?
  | 'medicine_missed'  // Which medicines were skipped/missed?
  | 'medicine_timing'  // Is she taking medicines on time?
  | 'medicine_pattern' // What is her overall adherence pattern?
  | 'sugar_trend'      // How has her blood sugar been?
  | 'bp_trend'         // How has her blood pressure been?
  | 'weight_trend'     // How has her weight changed?
  | 'health_summary'   // General recent health overview
  | 'unknown';         // Low-confidence / out-of-scope question

// ── Request / Response contracts ───────────────────────────────────────────────

/** Incoming request body for the chatbot intent endpoint. */
export interface ChatbotIntentRequest {
  /** The raw natural-language question from the user. */
  question: string;
  /**
   * Optional patient ID.
   * When provided, the authenticated user's access to this patient is
   * verified before medical data is queried.
   */
  patientId?: string;
}

/** The response returned by the Python ML classifier. */
export interface IntentPrediction {
  /** The predicted intent label. */
  intent: ChatbotIntent;
  /** Probability of the predicted class (0 – 1). */
  confidence: number;
}

/** The full chatbot API response sent back to the frontend. */
export interface ChatbotResponse {
  intent: ChatbotIntent;
  confidence: number;
  /** Human-readable answer built from deterministic DB analytics. */
  answer: string;
}

// ── Type guard ─────────────────────────────────────────────────────────────────
const KNOWN_INTENTS: readonly ChatbotIntent[] = [
  'medicine_today',
  'medicine_missed',
  'medicine_timing',
  'medicine_pattern',
  'sugar_trend',
  'bp_trend',
  'weight_trend',
  'health_summary',
  'unknown',
] as const;

/**
 * Validates that a raw string value is a known ChatbotIntent.
 * Used to reject unexpected values from the Python process output.
 */
export function isChatbotIntent(value: unknown): value is ChatbotIntent {
  return typeof value === 'string' && (KNOWN_INTENTS as readonly string[]).includes(value);
}
