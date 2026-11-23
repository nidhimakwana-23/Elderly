import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import type { FallDetectionController } from './fall-detection.controller';

export function createFallDetectionRouter(controller: FallDetectionController): Router {
  const router = Router();

  // ML inference proxy endpoint
  router.post('/predict', requireAuth, (req, res) => controller.predict(req, res));

  // Fall event management
  router.post('/events', requireAuth, (req, res) => controller.createEvent(req, res));
  router.get('/events/mine', requireAuth, (req, res) => controller.getMyEvents(req, res));
  router.get('/events/caregiver', requireAuth, (req, res) => controller.getCaregiverEvents(req, res));
  router.get('/events/:id', requireAuth, (req, res) => controller.getEventById(req, res));
  router.patch('/events/:id/acknowledge', requireAuth, (req, res) => controller.acknowledgeEvent(req, res));
  router.patch('/events/:id/resolve', requireAuth, (req, res) => controller.resolveEvent(req, res));
  router.patch('/events/:id/false-alarm', requireAuth, (req, res) => controller.markFalseAlarm(req, res));

  // Caregiver in-app notifications
  router.get('/notifications', requireAuth, (req, res) => controller.getNotifications(req, res));
  router.patch('/notifications/:id/read', requireAuth, (req, res) => controller.markNotificationRead(req, res));

  // Healthcheck
  router.get('/health', (_req, res) => {
    res.json({ status: 'healthy', module: 'fall-detection' });
  });

  return router;
}
