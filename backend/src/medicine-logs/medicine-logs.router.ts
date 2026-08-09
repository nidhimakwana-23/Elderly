import { Router } from 'express';
import type { MedicineLogsController } from './medicine-logs.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePatientAccess } from '../middleware/patient-access.middleware.js';
import type { IUserRepository } from '../db/user.repository.js';

export function createMedicineLogsRouter(
  controller: MedicineLogsController,
  userRepository: IUserRepository,
): Router {
  const router = Router();

  // Require authentication for all routes
  router.use(requireAuth);
  const patientAccess = requirePatientAccess(userRepository);

  // POST /api/medicine-logs
  router.post('/', controller.createLog);

  // PATCH /api/medicine-logs/:id/status
  router.patch('/:id/status', controller.updateLogStatus);

  // GET /api/medicine-logs/:elderlyId
  router.get('/:elderlyId', patientAccess, controller.getLogsByElderly);

  return router;
}

export function createMedicineReportRouter(
  controller: MedicineLogsController,
  userRepository: IUserRepository,
): Router {
  const router = Router();

  // Require authentication for all routes
  router.use(requireAuth);
  const patientAccess = requirePatientAccess(userRepository);

  // GET /api/medicine-report/:elderlyId
  router.get('/:elderlyId', patientAccess, controller.getReport);

  // GET /api/medicine-report/:elderlyId/daily
  router.get('/:elderlyId/daily', patientAccess, controller.getDailyReport);

  // GET /api/medicine-report/:elderlyId/weekly
  router.get('/:elderlyId/weekly', patientAccess, controller.getWeeklyReport);

  // GET /api/medicine-report/:elderlyId/monthly
  router.get('/:elderlyId/monthly', patientAccess, controller.getMonthlyReport);

  return router;
}
