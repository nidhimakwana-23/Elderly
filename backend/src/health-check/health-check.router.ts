import { Router } from 'express';
import type { HealthCheckController } from './health-check.controller.js';

export function createHealthCheckRouter(healthCheckController: HealthCheckController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/health-checks:
   *   post:
   *     summary: Create a new health check record
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateHealthCheckDto'
   *     responses:
   *       201:
   *         description: Health check created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthCheck'
   *       400:
   *         description: Bad request (validation errors)
   */
  router.post('/', healthCheckController.createHealthCheck);

  /**
   * @openapi
   * /api/health-checks:
   *   get:
   *     summary: Get all health checks for a specific patient
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: patient_id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: A list of health checks
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/HealthCheck'
   *       400:
   *         description: Bad request (missing patient_id)
   */
  router.get('/', healthCheckController.getHealthChecks);

  /**
   * @openapi
   * /api/health-checks/{id}:
   *   get:
   *     summary: Get a health check by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Health check details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthCheck'
   *       404:
   *         description: Not found
   */
  router.get('/:id', healthCheckController.getHealthCheckById);

  /**
   * @openapi
   * /api/health-checks/{id}:
   *   put:
   *     summary: Update a health check
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateHealthCheckDto'
   *     responses:
   *       200:
   *         description: Health check updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthCheck'
   *       404:
   *         description: Not found
   */
  router.put('/:id', healthCheckController.updateHealthCheck);

  /**
   * @openapi
   * /api/health-checks/{id}:
   *   delete:
   *     summary: Delete a health check
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Deleted successfully
   *       404:
   *         description: Not found
   */
  router.delete('/:id', healthCheckController.deleteHealthCheck);

  return router;
}
