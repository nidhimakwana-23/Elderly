import type { IHealthCheckRepository } from '../db/health-check.repository';
import type { CreateHealthCheckDto, HealthCheck, UpdateHealthCheckDto } from './health-check.types';
import { randomUUID } from 'node:crypto';

export class HealthCheckService {
  constructor(private readonly repo: IHealthCheckRepository) { }

  async createHealthCheck(dto: CreateHealthCheckDto): Promise<HealthCheck> {
    const healthCheck: HealthCheck = {
      ...dto,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.repo.create(healthCheck);
  }

  async getHealthChecks(patient_id: string): Promise<HealthCheck[]> {
    return this.repo.findAll(patient_id);
  }

  async getHealthCheckById(id: string): Promise<HealthCheck | undefined> {
    return this.repo.findById(id);
  }

  async updateHealthCheck(id: string, dto: UpdateHealthCheckDto): Promise<HealthCheck | undefined> {
    return this.repo.update(id, dto as Partial<HealthCheck>);
  }

  async deleteHealthCheck(id: string): Promise<boolean> {
    return this.repo.softDelete(id);
  }
}
