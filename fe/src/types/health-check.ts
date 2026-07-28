import { z } from 'zod';

export const HealthCheckSchema = z.object({
  id: z.string().optional(), // Optional for creation
  patient_id: z.string().optional(),
  recorded_by_id: z.string().optional(),
  sugar_level: z.number().optional().or(z.nan()),
  weight: z.number().optional().or(z.nan()),
  blood_pressure: z.string().optional(),
  blood_level: z.string().optional(),
  bmi: z.number().optional().or(z.nan()),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export type CreateHealthCheckDto = Omit<HealthCheck, 'id' | 'created_at' | 'updated_at'>;
export type UpdateHealthCheckDto = Partial<CreateHealthCheckDto>;
