/**
 * chatbot.controller.ts
 *
 * Exposes two endpoints:
 *
 *   POST /api/chatbot/intent
 *     ← Only intent classification (for testing).
 *        Does NOT query patient data.  No patient ID required.
 *
 *   POST /api/chatbot/ask
 *     ← Full flow: classify intent + run DB analytics + return answer.
 *        Requires JWT auth + patient access validation.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ChatbotService } from './chatbot.service';
import { logger } from '../utils/logger';

export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /api/chatbot/intent
   *
   * Classify the intent of a question without querying patient data.
   * Useful for integration testing and development.
   *
   * Request body: { question: string }
   * Response:     { intent: string, confidence: number }
   */
  intentOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question } = req.body as { question?: unknown };

      if (typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Body must contain a non-empty "question" string.' });
        return;
      }

      const prediction = await this.chatbotService.classifyIntent(question.trim());
      res.json(prediction);
    } catch (error) {
      logger.error('[ChatbotController] intentOnly error:', error);
      next(error);
    }
  };

  /**
   * POST /api/chatbot/ask
   *
   * Full chatbot flow: classify intent → query verified patient data → answer.
   *
   * Requires: JWT auth (requireAuth) + patient access check (requirePatientAccess).
   * The patientId is resolved in the following priority:
   *   1. req.body.patientId (sent by the client)
   *   2. req.user.id        (the authenticated user's own ID, as fallback)
   *
   * Request body: { question: string, patientId?: string }
   * Response:     { intent: string, confidence: number, answer: string }
   */
  ask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, patientId: bodyPatientId } = req.body as {
        question?: unknown;
        patientId?: unknown;
      };

      if (typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Body must contain a non-empty "question" string.' });
        return;
      }

      // Resolve the patient ID — prefer explicit body value, fall back to caller's own ID
      const patientId =
        typeof bodyPatientId === 'string' && bodyPatientId.trim().length > 0
          ? bodyPatientId.trim()
          : req.user?.id;

      if (!patientId) {
        res.status(400).json({ error: 'Could not determine patient ID from request.' });
        return;
      }

      // Classify intent (privacy: only the question text is sent to Python)
      const prediction = await this.chatbotService.classifyIntent(question.trim());

      // Build a deterministic DB-backed answer
      const response = await this.chatbotService.buildAnswer(prediction, patientId);

      res.json(response);
    } catch (error) {
      logger.error('[ChatbotController] ask error:', error);
      next(error);
    }
  };
}
