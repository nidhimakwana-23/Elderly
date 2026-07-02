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
   *             type: object
   *             properties:
   *               fullName:
   *                 type: string
   *               dob:
   *                 type: string
   *               medicalConditions:
   *                 type: array
   *                 items:
   *                   type: string
   *               emergencyContacts:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     name:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     relation:
   *                       type: string
   *             required:
   *               - fullName
   *               - dob
   *     responses:
   *       201:
   *         description: Profile created successfully
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
   *       401:
   *         description: Unauthorized
   */
  router.get('/', controller.getProfiles);

  return router;
}
