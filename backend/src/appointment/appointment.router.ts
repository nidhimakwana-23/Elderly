import { Router } from 'express';
import type { AppointmentController } from './appointment.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export function createAppointmentRouter(controller: AppointmentController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/appointments:
   *   post:
   *     summary: Book an appointment (patients)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Appointment booked
   */
  router.post('/', requireAuth, controller.book);

  /**
   * @openapi
   * /api/appointments/me:
   *   get:
   *     summary: Get my appointments (patient gets own; doctor gets their schedule)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of appointments
   */
  router.get('/me', requireAuth, controller.getMyAppointments);

  /**
   * @openapi
   * /api/appointments/{id}/status:
   *   patch:
   *     summary: Update appointment status (doctors only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Status updated
   *       403:
   *         description: Forbidden
   */
  router.patch('/:id/status', requireAuth, requireRole('doctor'), controller.updateStatus);

  /**
   * @openapi
   * /api/appointments/{id}:
   *   delete:
   *     summary: Cancel an appointment
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204:
   *         description: Cancelled
   */
  router.delete('/:id', requireAuth, controller.cancel);

  return router;
}
