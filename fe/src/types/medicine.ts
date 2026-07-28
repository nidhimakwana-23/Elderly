import { z } from 'zod';

export const MedicineSchema = z.object({
  id: z.string().uuid().optional(),
  patient_id: z.string().optional(),
  medicine_name: z.string().min(1, "Medicine Name is required"),
  medicine_type: z.enum(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Other']),
  dosage: z.string().min(1, "Dosage is required"),
  strength: z.string().optional(),
  frequency: z.enum(['Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily', 'Every 6 Hours', 'Weekly', 'Custom']),
  timing: z.array(z.string()).default([]),
  start_date: z.string().min(1, "Start Date is required"),
  end_date: z.string().optional(),
  reminder_enabled: z.boolean().default(false),
  reminder_times: z.array(z.string()).default([]),
  quantity: z.number().optional(),
  doctor_name: z.string().optional(),
  prescription_number: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['Active', 'Completed', 'Upcoming', 'Expired']).default('Active'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).refine((data) => {
  if (data.reminder_enabled && data.reminder_times.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Reminder time is required when reminder is enabled",
  path: ["reminder_times"]
}).refine((data) => {
  if (data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
    return false;
  }
  return true;
}, {
  message: "End Date cannot be earlier than Start Date",
  path: ["end_date"]
});

export type Medicine = z.infer<typeof MedicineSchema>;
export type CreateMedicineDto = Omit<Medicine, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMedicineDto = Partial<CreateMedicineDto>;
