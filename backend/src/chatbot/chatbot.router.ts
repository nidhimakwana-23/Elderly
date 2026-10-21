/**
 * chatbot.router.ts
 *
 * Mounts chatbot routes following the same convention as the rest of the project.
 *
 * Routes:
 *   POST /api/chatbot/intent — classifier-only endpoint (no patient data accessed; public/developer testing)
 *   POST /api/chatbot/ask    — full chatbot flow (auth + patient-access authorization required)
 */

import { Router } from 'express';
import type { ChatbotController } from './chatbot.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePatientAccess } from '../middleware/patient-access.middleware';
import type { IUserRepository } from '../db/user.repository';

export function createChatbotRouter(
  chatbotController: ChatbotController,
  userRepository: IUserRepository,
): Router {
  const router = Router();

  /**
   * @openapi
   * /api/chatbot/intent:
   *   post:
   *     summary: Classify the intent of a natural-language question
   *     description: |
   *       Passes the question to the Python ML classifier (TF-IDF + Logistic Regression)
   *       and returns the predicted intent and confidence score.
   *       Patient medical data is NEVER sent to the ML model.
   *       Does not query MongoDB or patient records.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [question]
   *             properties:
   *               question:
   *                 type: string
   *                 example: "Is mom taking her medicines on time?"
   *     responses:
   *       200:
   *         description: Intent classification result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 intent:
   *                   type: string
   *                   example: medicine_timing
   *                 confidence:
   *                   type: number
   *                   example: 0.83
   *       400:
   *         description: Missing or invalid request body
   *       503:
   *         description: Classifier service unavailable
   */
  router.post('/intent', chatbotController.intentOnly);

  /**
   * @openapi
   * /api/chatbot/ask:
   *   post:
   *     summary: Ask the chatbot a health-related question about a patient
   *     description: |
   *       Full chatbot flow:
   *       1. Classifies intent via the Python ML model (question text only).
   *       2. Verifies the authenticated user's access to the target patient.
   *       3. Queries the appropriate MongoDB collections.
   *       4. Returns a deterministic, factual answer.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [question]
   *             properties:
   *               question:
   *                 type: string
   *                 example: "Did mom take her medicine today?"
   *               patientId:
   *                 type: string
   *                 description: ID of the patient to query. If omitted, defaults to the caller's own ID.
   *     responses:
   *       200:
   *         description: Chatbot answer
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 intent:
   *                   type: string
   *                 confidence:
   *                   type: number
   *                 answer:
   *                   type: string
   *       400:
   *         description: Missing or invalid request body
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied for this patient
   *       500:
   *         description: Internal server error
   */
  router.post('/ask', requireAuth, requirePatientAccess(userRepository), chatbotController.ask);

  return router;
}
