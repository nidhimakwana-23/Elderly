import { z } from 'zod';

export const MedicineSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  medicine_name: z.string(),
  medicine_type: z.enum(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Other']),
  dosage: z.string(),
  strength: z.string().optional(),
  frequency: z.enum([
    'Once Daily',
    'Twice Daily',
    'Three Times Daily',
    'Four Times Daily',
    'Every 6 Hours',
    'Weekly',
    'Custom',
  ]),
  timing: z.array(z.string()),
  start_date: z.string(),
  end_date: z.string().optional(),
  reminder_enabled: z.boolean(),
  reminder_times: z.array(z.string()),
  quantity: z.number().optional(),
  doctor_name: z.string().optional(),
  prescription_number: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['Active', 'Completed', 'Upcoming', 'Expired']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Medicine = z.infer<typeof MedicineSchema>;

export const CreateMedicineDtoSchema = MedicineSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateMedicineDto = z.infer<typeof CreateMedicineDtoSchema>;

export const UpdateMedicineDtoSchema = CreateMedicineDtoSchema.partial();

export type UpdateMedicineDto = Partial<CreateMedicineDto>;
