import type { Request, Response } from 'express';
import type { AiService } from './ai.service';
import { AiChatRequestSchema, CreateSessionRequestSchema, UpdateSessionTitleRequestSchema } from './ai.types';

export class AiController {
  constructor(private readonly aiService: AiService) {
    this.chat = this.chat.bind(this);
    this.createSession = this.createSession.bind(this);
    this.listSessions = this.listSessions.bind(this);
    this.getSession = this.getSession.bind(this);
    this.updateSessionTitle = this.updateSessionTitle.bind(this);
    this.deleteSession = this.deleteSession.bind(this);
  }


  // ── POST /api/ai/sessions ──────────────────────────────────────────────────
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parsed = CreateSessionRequestSchema.parse(req.body);
      const { patientId } = parsed;
      const firstMessage: string = req.body.firstMessage ?? '';

      const session = await this.aiService.createSession(userId, patientId, firstMessage);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.errors ?? err.message });
    }
  }

  // ── GET /api/ai/sessions ───────────────────────────────────────────────────
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessions = await this.aiService.listSessions(userId);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/ai/sessions/:sessionId ───────────────────────────────────────
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params as { sessionId: string };
      const session = await this.aiService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Ownership check — only the session owner can view it
      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH /api/ai/sessions/:sessionId/title ──────────────────────────────
  async updateSessionTitle(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params as { sessionId: string };
      const parsed = UpdateSessionTitleRequestSchema.parse(req.body);

      const session = await this.aiService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const updated = await this.aiService.updateSessionTitle(sessionId, parsed.title);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.errors ?? err.message });
    }
  }

  // ── DELETE /api/ai/sessions/:sessionId ────────────────────────────────────

  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params as { sessionId: string };
      const session = await this.aiService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await this.aiService.deleteSession(sessionId);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/ai/chat ──────────────────────────────────────────────────────
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const parsed = AiChatRequestSchema.parse(req.body);
      const { patientId, messages, sessionId } = parsed;

      // ── Set SSE headers ────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable proxy buffering
      res.flushHeaders();

      // ── Stream Gemini response chunk by chunk ──────────────────────────────
      try {
        for await (const chunk of this.aiService.streamChat(patientId, messages, sessionId)) {
          // Format: data: <text>\n\n  (plain SSE)
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      } catch (streamError: any) {
        // Send error as an SSE event so the client can handle it gracefully
        res.write(`data: ${JSON.stringify({ error: streamError.message ?? 'Stream error' })}\n\n`);
      }

      // ── Signal end of stream ───────────────────────────────────────────────
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (validationError: any) {
      res.status(400).json({ error: validationError.errors ?? validationError.message });
    }
  }
}
