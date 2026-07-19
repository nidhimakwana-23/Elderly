import type { Request, Response } from 'express';
import type { HealthCheckService } from './health-check.service.js';
import { CreateHealthCheckDtoSchema, UpdateHealthCheckDtoSchema } from './health-check.types.js';

export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {
    // Bind methods to preserve 'this' context when used as Express handlers
    this.createHealthCheck = this.createHealthCheck.bind(this);
    this.getHealthChecks = this.getHealthChecks.bind(this);
    this.getHealthCheckById = this.getHealthCheckById.bind(this);
    this.updateHealthCheck = this.updateHealthCheck.bind(this);
    this.deleteHealthCheck = this.deleteHealthCheck.bind(this);
  }

  async createHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const parsedData = CreateHealthCheckDtoSchema.parse(req.body);
      
      // If recorded_by_id is not provided, we could optionally extract it from the user token here
      // For now, we trust the client to send it in the body if they are adding on behalf of an elder,
      // or we just save what's parsed.

      const healthCheck = await this.healthCheckService.createHealthCheck(parsedData);
      res.status(201).json(healthCheck);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  async getHealthChecks(req: Request, res: Response): Promise<void> {
    try {
      const patient_id = req.query['patient_id'] as string;
      
      if (!patient_id) {
        res.status(400).json({ error: 'patient_id query parameter is required' });
        return;
      }

      const healthChecks = await this.healthCheckService.getHealthChecks(patient_id);
      res.json(healthChecks);
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getHealthCheckById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const healthCheck = await this.healthCheckService.getHealthCheckById(id as string);
      if (!healthCheck) {
        res.status(404).json({ error: 'Health check record not found' });
        return;
      }
      res.json(healthCheck);
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async updateHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsedData = UpdateHealthCheckDtoSchema.parse(req.body);
      const updatedHealthCheck = await this.healthCheckService.updateHealthCheck(id as string, parsedData);
      if (!updatedHealthCheck) {
        res.status(404).json({ error: 'Health check record not found' });
        return;
      }
      res.json(updatedHealthCheck);
    } catch (error: any) {
      res.status(400).json({ error: error.errors || error.message });
    }
  }

  async deleteHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.healthCheckService.deleteHealthCheck(id as string);
      if (!success) {
        res.status(404).json({ error: 'Health check record not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
