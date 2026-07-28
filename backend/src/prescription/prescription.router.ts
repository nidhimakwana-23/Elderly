import { Router } from 'express';
import type { PrescriptionController } from './prescription.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

export function createPrescriptionRouter(controller: PrescriptionController): Router {
  const router = Router();

  router.post('/',                      requireAuth, requireRole('doctor'), controller.create);
  router.get('/patient/:patientId',     requireAuth,                        controller.getForPatient);
  router.get('/:id',                    requireAuth,                        controller.getById);
  router.patch('/:id',                  requireAuth, requireRole('doctor'), controller.update);
  router.delete('/:id',                 requireAuth, requireRole('doctor'), controller.deletePrescription);

  return router;
}
