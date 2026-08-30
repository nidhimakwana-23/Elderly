import { Router } from 'express';
import type { EmergencyController } from './emergency.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export function createEmergencyRouter(controller: EmergencyController): Router {
  const router = Router();

  router.post('/',          requireAuth,                          controller.raise);
  router.get('/open',       requireAuth, requireRole('doctor'),   controller.getOpenNearby);
  router.get('/mine',       requireAuth,                          controller.getMyEmergencies);
  router.patch('/:id/accept',  requireAuth, requireRole('doctor'), controller.accept);
  router.patch('/:id/resolve', requireAuth, requireRole('doctor'), controller.resolve);
  router.patch('/:id/cancel',  requireAuth,                        controller.cancel);

  return router;
}
