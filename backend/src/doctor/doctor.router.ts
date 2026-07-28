import { Router } from 'express';
import type { DoctorController } from './doctor.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

export function createDoctorRouter(controller: DoctorController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/doctors/nearby:
   *   get:
   *     summary: Find nearby available doctors
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: lat
   *         required: true
   *         schema: { type: number }
   *       - in: query
   *         name: lng
   *         required: true
   *         schema: { type: number }
   *       - in: query
   *         name: radius
   *         schema: { type: integer, default: 10000 }
   *         description: Radius in metres (default 10 km)
   *       - in: query
   *         name: specialization
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of nearby doctor profiles
   */
  router.get('/nearby', requireAuth, controller.searchNearby);

  /**
   * @openapi
   * /api/doctors/me:
   *   get:
   *     summary: Get own doctor profile
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Doctor profile
   */
  router.get('/me', requireAuth, requireRole('doctor'), controller.getMyProfile);

  /**
   * @openapi
   * /api/doctors/profile:
   *   post:
   *     summary: Create a doctor profile (doctors only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDoctorProfileDto'
   *     responses:
   *       201:
   *         description: Doctor profile created
   */
  router.post('/profile', requireAuth, requireRole('doctor'), controller.createProfile);

  /**
   * @openapi
   * /api/doctors/profile:
   *   patch:
   *     summary: Update own doctor profile fields
   *     security:
   *       - bearerAuth: []
   */
  router.patch('/profile', requireAuth, requireRole('doctor'), controller.updateProfile);

  /**
   * @openapi
   * /api/doctors/availability:
   *   patch:
   *     summary: Update doctor availability slots
   *     security:
   *       - bearerAuth: []
   */
  router.patch('/availability', requireAuth, requireRole('doctor'), controller.updateAvailability);

  /**
   * @openapi
   * /api/doctors/{id}:
   *   get:
   *     summary: Get a doctor's public profile by profile id
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Doctor public profile
   *       404:
   *         description: Not found
   */
  router.get('/:id', requireAuth, controller.getProfileById);

  return router;
}
