import type { Request, Response } from 'express';
import {
  CreateFallEventDtoSchema,
  PredictRequestSchema,
} from './fall-detection.types';
import {
  FallDetectionService,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './fall-detection.service';
import { logger } from '../utils/logger';

export class FallDetectionController {
  constructor(private readonly fallDetectionService: FallDetectionService) {}

  private handleError(res: Response, err: unknown): void {
    if (err instanceof NotFoundError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    logger.error('[FallDetectionController] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parsed = CreateFallEventDtoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation error',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await this.fallDetectionService.createFallEvent(parsed.data, callerId);
      const statusCode = result.duplicate ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async getMyEvents(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const events = await this.fallDetectionService.getEventsForPatient(callerId, callerId);
      res.json({ events });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async getCaregiverEvents(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const events = await this.fallDetectionService.getEventsForCaregiver(callerId);
      res.json({ events });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const event = await this.fallDetectionService.getEventById(req.params['id'] as string, callerId);
      res.json({ event });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async acknowledgeEvent(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const event = await this.fallDetectionService.acknowledgeEvent(
        req.params['id'] as string,
        callerId,
        req.user?.email
      );
      res.json({ event });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async resolveEvent(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const event = await this.fallDetectionService.resolveEvent(
        req.params['id'] as string,
        callerId,
        req.user?.email
      );
      res.json({ event });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async markFalseAlarm(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const event = await this.fallDetectionService.markFalseAlarm(
        req.params['id'] as string,
        callerId,
        req.user?.email
      );
      res.json({ event });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const notifications = await this.fallDetectionService.getNotifications(callerId);
      res.json({ notifications });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const notification = await this.fallDetectionService.markNotificationRead(
        req.params['id'] as string,
        callerId
      );
      res.json({ notification });
    } catch (err) {
      this.handleError(res, err);
    }
  }

  async predict(req: Request, res: Response): Promise<void> {
    try {
      const parsed = PredictRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation error',
          details: parsed.error.issues,
        });
        return;
      }

      const result = await this.fallDetectionService.predictWindow(parsed.data);
      res.json(result);
    } catch (err) {
      this.handleError(res, err);
    }
  }
}
