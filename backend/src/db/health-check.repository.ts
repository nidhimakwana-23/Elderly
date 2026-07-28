import type { HealthCheck } from '../health-check/health-check.types.js';

export interface IHealthCheckRepository {
  create(healthCheck: HealthCheck): Promise<HealthCheck>;
  findById(id: string): Promise<HealthCheck | undefined>;
  findAll(patient_id: string): Promise<HealthCheck[]>;
  update(id: string, updates: Partial<HealthCheck>): Promise<HealthCheck | undefined>;
  delete(id: string): Promise<boolean>;
}
