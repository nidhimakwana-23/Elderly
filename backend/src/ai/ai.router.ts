import { Router } from 'express';
import type { AiController } from './ai.controller.js';

export function createAiRouter(aiController: AiController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/ai/chat:
   *   post:
   *     summary: Stream an AI health assistant response
   *     description: |
   *       Accepts a patientId and message history, fetches the patient's health
   *       data from the database, and streams a Gemini AI response as SSE events.
   *       Each event is `data: {"text":"..."}` and the stream ends with `data: [DONE]`.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [patientId, messages]
   *             properties:
   *               patientId:
   *                 type: string
   *               messages:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     role:
   *                       type: string
   *                       enum: [user, assistant]
   *                     content:
   *                       type: string
   *     responses:
   *       200:
   *         description: SSE stream of text chunks
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   *       400:
   *         description: Validation error
   */
  router.post('/chat', aiController.chat);

  return router;
}
