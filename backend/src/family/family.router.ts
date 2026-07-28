import { Router } from 'express';
import type { FamilyController } from './family.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export function createFamilyRouter(controller: FamilyController): Router {
  const router = Router();

  // All family routes require authentication
  router.use(requireAuth);

  /**
   * @openapi
   * /api/family:
   *   post:
   *     summary: Create an elderly profile
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateFamilyProfileInput'
   *     responses:
   *       201:
   *         description: Profile created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 profile:
   *                   $ref: '#/components/schemas/FamilyProfile'
   *       401:
   *         description: Unauthorized
   */
  router.post('/', controller.createProfile);

  /**
   * @openapi
   * /api/family:
   *   get:
   *     summary: Get all elderly profiles for the current user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of elderly profiles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 profiles:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/FamilyProfile'
   *       401:
   *         description: Unauthorized
   */
  router.get('/', controller.getProfiles);

  return router;
}
