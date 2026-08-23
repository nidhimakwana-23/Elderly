import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { MedicineLogsService, ValidationError } from './medicine-logs.service.js';

export class MedicineLogsController {
  constructor(private readonly medicineLogsService: MedicineLogsService) { }

  createLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const log = await this.medicineLogsService.logMedicine(req.body);
      res.status(201).json({ message: 'Medicine log created successfully', log });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        logger.error('[MedicineLogsController.createLog] Create Medicine Log Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getLogsByElderly = async (req: Request, res: Response): Promise<void> => {
    try {
      const elderlyId = req.params.elderlyId as string;
      if (!elderlyId) {
        res.status(400).json({ error: 'Elderly ID is required' });
        return;
      }
      const date = req.query.date as string | undefined;
      const logs = await this.medicineLogsService.getMedicineHistory(elderlyId, date);
      res.json({ logs });
    } catch (error) {
      logger.error('[MedicineLogsController.getLogsByElderly] Get Medicine History Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateLogStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const logId = req.params.id as string;
      const { status, skippedReason, takenTime } = req.body;
      if (!logId || !status) {
        res.status(400).json({ error: 'Log ID and status are required' });
        return;
      }
      const updatedLog = await this.medicineLogsService.updateLogStatus(logId, status, skippedReason, takenTime);
      res.json({ message: 'Log status updated successfully', log: updatedLog });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        logger.error('[MedicineLogsController.updateLogStatus] Update Log Status Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const elderlyId = req.params.elderlyId as string;
      if (!elderlyId) {
        res.status(400).json({ error: 'Elderly ID is required' });
        return;
      }
      const report = await this.medicineLogsService.generateReport(elderlyId, 'all');
      res.json(report);
    } catch (error) {
      logger.error('[MedicineLogsController.getReport] Get Medicine Report Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getDailyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const elderlyId = req.params.elderlyId as string;
      if (!elderlyId) {
        res.status(400).json({ error: 'Elderly ID is required' });
        return;
      }
      const report = await this.medicineLogsService.generateReport(elderlyId, 'daily');
      res.json(report);
    } catch (error) {
      logger.error('[MedicineLogsController.getDailyReport] Get Daily Report Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getWeeklyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const elderlyId = req.params.elderlyId as string;
      if (!elderlyId) {
        res.status(400).json({ error: 'Elderly ID is required' });
        return;
      }
      const report = await this.medicineLogsService.generateReport(elderlyId, 'weekly');
      res.json(report);
    } catch (error) {
      logger.error('[MedicineLogsController.getWeeklyReport] Get Weekly Report Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getMonthlyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const elderlyId = req.params.elderlyId as string;
      if (!elderlyId) {
        res.status(400).json({ error: 'Elderly ID is required' });
        return;
      }
      const report = await this.medicineLogsService.generateReport(elderlyId, 'monthly');
      res.json(report);
    } catch (error) {
      logger.error('[MedicineLogsController.getMonthlyReport] Get Monthly Report Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
