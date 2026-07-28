import { Router } from 'express';
import type { MedicineLogsController } from './medicine-logs.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export function createMedicineLogsRouter(controller: MedicineLogsController): Router {
  const router = Router();

  // Require authentication for all routes
  router.use(requireAuth);

  // POST /api/medicine-logs
  router.post('/', controller.createLog);

  // PATCH /api/medicine-logs/:id/status
  router.patch('/:id/status', controller.updateLogStatus);

  // GET /api/medicine-logs/:elderlyId
  router.get('/:elderlyId', controller.getLogsByElderly);

  return router;
}

export function createMedicineReportRouter(controller: MedicineLogsController): Router {
  const router = Router();

  // Require authentication for all routes
  router.use(requireAuth);

  // GET /api/medicine-report/:elderlyId
  router.get('/:elderlyId', controller.getReport);

  // GET /api/medicine-report/:elderlyId/daily
  router.get('/:elderlyId/daily', controller.getDailyReport);

  // GET /api/medicine-report/:elderlyId/weekly
  router.get('/:elderlyId/weekly', controller.getWeeklyReport);

  // GET /api/medicine-report/:elderlyId/monthly
  router.get('/:elderlyId/monthly', controller.getMonthlyReport);

  return router;
}
