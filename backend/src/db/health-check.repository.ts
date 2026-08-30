import type { HealthCheck } from '../health-check/health-check.types';

export interface IHealthCheckRepository {
  create(healthCheck: HealthCheck): Promise<HealthCheck>;
  findById(id: string): Promise<HealthCheck | undefined>;
  findAll(patient_id: string): Promise<HealthCheck[]>;
  update(id: string, updates: Partial<HealthCheck>): Promise<HealthCheck | undefined>;
  /** Permanently removes the document. Prefer softDelete for recoverable deletes. */
  delete(id: string): Promise<boolean>;
  /** Sets deleted_at to the current timestamp; the document remains in the DB. */
  softDelete(id: string): Promise<boolean>;
}
