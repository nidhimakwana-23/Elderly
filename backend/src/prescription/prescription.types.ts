import { z } from 'zod';

export const MedicationItemSchema = z.object({
  name: z.string(),
  dosage: z.string(),           // e.g. "500mg"
  frequency: z.string(),        // e.g. "twice daily"
  duration: z.string(),         // e.g. "7 days"
  instructions: z.string().optional(),
});

export type MedicationItem = z.infer<typeof MedicationItemSchema>;

export const PrescriptionSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  doctor_id: z.string(),         // User.id of the authoring doctor — set from JWT, never from body
  appointment_id: z.string().optional(),
  diagnosis: z.string(),
  medications: z.array(MedicationItemSchema),
  notes: z.string().optional(),
  issued_at: z.string(),         // ISO datetime
  valid_until: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  /** ISO datetime set when the prescription is soft-deleted; absent on active records. */
  deleted_at: z.string().optional(),
});

export type Prescription = z.infer<typeof PrescriptionSchema>;

export const CreatePrescriptionDtoSchema = PrescriptionSchema.omit({
  id: true,
  doctor_id: true,   // populated from JWT in service
  created_at: true,
  updated_at: true,
});

export type CreatePrescriptionDto = z.infer<typeof CreatePrescriptionDtoSchema>;

export const UpdatePrescriptionDtoSchema = CreatePrescriptionDtoSchema.partial();

export type UpdatePrescriptionDto = z.infer<typeof UpdatePrescriptionDtoSchema>;
