import { z } from 'zod';

export const HealthCheckSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  recorded_by_id: z.string().optional(),
  sugar_level: z.number().optional(),
  weight: z.number().optional(),
  blood_pressure: z.string().optional(),
  blood_level: z.string().optional(),
  bmi: z.number().optional(),
  date: z.string(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  /** ISO datetime set when the health-check is soft-deleted; absent on active records. */
  deleted_at: z.string().optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const CreateHealthCheckDtoSchema = HealthCheckSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateHealthCheckDto = z.infer<typeof CreateHealthCheckDtoSchema>;

export const UpdateHealthCheckDtoSchema = CreateHealthCheckDtoSchema.partial();

export type UpdateHealthCheckDto = z.infer<typeof UpdateHealthCheckDtoSchema>;
