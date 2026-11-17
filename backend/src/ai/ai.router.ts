import { Router } from 'express';
import type { AiController } from './ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

export function createAiRouter(aiController: AiController): Router {
  const router = Router();

  // All AI routes require a valid JWT
  router.use(requireAuth);

  /**
   * @openapi
   * /api/ai/sessions:
   *   post:
   *     summary: Create a new conversation session
   *     description: |
   *       Creates a new empty conversation session for the authenticated user and
   *       the given patientId. Optionally accepts a `firstMessage` string that is
   *       used to derive the session title (first 60 characters).
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [patientId]
   *             properties:
   *               patientId:
   *                 type: string
   *               firstMessage:
   *                 type: string
   *     responses:
   *       201:
   *         description: Newly created ConversationSession
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.post('/sessions', aiController.createSession);

  /**
   * @openapi
   * /api/ai/sessions:
   *   get:
   *     summary: List all conversation sessions for the authenticated user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Array of ConversationSession objects, newest first
   *       401:
   *         description: Unauthorized
   */
  router.get('/sessions', aiController.listSessions);

  /**
   * @openapi
   * /api/ai/sessions/{sessionId}:
   *   get:
   *     summary: Get a single conversation session by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: ConversationSession with full message history
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden (not the session owner)
   *       404:
   *         description: Session not found
   */
  router.get('/sessions/:sessionId', aiController.getSession);

  /**
   * @openapi
   * /api/ai/sessions/{sessionId}/title:
   *   patch:
   *     summary: Update conversation session title
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title]
   *             properties:
   *               title:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated ConversationSession
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Session not found
   */
  router.patch('/sessions/:sessionId/title', aiController.updateSessionTitle);
  router.patch('/sessions/:sessionId', aiController.updateSessionTitle);

  /**
   * @openapi
   * /api/ai/sessions/{sessionId}:
   *   delete:
   *     summary: Delete a conversation session
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Session not found
   */
  router.delete('/sessions/:sessionId', aiController.deleteSession);


  /**
   * @openapi
   * /api/ai/chat:
   *   post:
   *     summary: Stream an AI health assistant response
   *     description: |
   *       Accepts a patientId and message history, fetches the patient's health
   *       data from the database, and streams a local Llama AI response as SSE events.
   *       Each event is `data: {"text":"..."}` and the stream ends with `data: [DONE]`.
   *       If a `sessionId` is provided, the user message and assembled assistant reply
   *       are persisted to MongoDB after the stream completes.
   *     security:
   *       - bearerAuth: []
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
   *               sessionId:
   *                 type: string
   *                 description: Optional. If provided, the turn is saved to the session.
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
