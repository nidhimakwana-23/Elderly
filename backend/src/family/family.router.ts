import { Router } from 'express';
import type { FamilyController } from './family.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export function createFamilyRouter(controller: FamilyController): Router {
  const router = Router();

  // All family routes require authentication
  router.use(requireAuth);

  // POST /api/family
  router.post('/', controller.createProfile);

  // GET /api/family
  router.get('/', controller.getProfiles);

  return router;
}
