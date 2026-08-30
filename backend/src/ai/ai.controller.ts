import type { Request, Response } from 'express';
import type { AiService } from './ai.service';
import { AiChatRequestSchema } from './ai.types';

export class AiController {
  constructor(private readonly aiService: AiService) {
    this.chat = this.chat.bind(this);
  }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const parsed = AiChatRequestSchema.parse(req.body);
      const { patientId, messages } = parsed;

      // ── Set SSE headers ────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable proxy buffering
      res.flushHeaders();

      // ── Stream Gemini response chunk by chunk ──────────────────────────────
      try {
        for await (const chunk of this.aiService.streamChat(patientId, messages)) {
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
