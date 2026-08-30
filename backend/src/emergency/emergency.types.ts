import { z } from 'zod';

export const EmergencyRequestSchema = z.object({
  id: z.string(),
  patient_id: z.string(),
  /** GeoJSON Point of the patient's current location — [longitude, latitude] */
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  description: z.string().optional(),
  status: z.enum(['open', 'accepted', 'resolved', 'cancelled']).default('open'),
  accepted_by_doctor_id: z.string().optional(), // DoctorProfile.id
  accepted_at: z.string().optional(),
  resolved_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  /** ISO datetime set when the emergency record is soft-deleted; absent on active records. */
  deleted_at: z.string().optional(),
});

export type EmergencyRequest = z.infer<typeof EmergencyRequestSchema>;

export const CreateEmergencyDtoSchema = EmergencyRequestSchema.pick({
  location: true,
  description: true,
});

export type CreateEmergencyDto = z.infer<typeof CreateEmergencyDtoSchema>;
