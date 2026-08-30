import { Router } from 'express';
import type { HealthTrendController } from './health-trend.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export function createHealthTrendRouter(controller: HealthTrendController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/health-trend/{patientId}:
   *   get:
   *     summary: Full health trend summary for a patient (doctors only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: patientId
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: from
   *         schema: { type: string }
   *         description: Start date filter YYYY-MM-DD
   *       - in: query
   *         name: to
   *         schema: { type: string }
   *         description: End date filter YYYY-MM-DD
   *     responses:
   *       200:
   *         description: Aggregated patient health summary
   */
  router.get('/:patientId', requireAuth, requireRole('doctor'), controller.getPatientSummary);

  return router;
}
