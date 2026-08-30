import { z } from 'zod';

export const AppointmentSchema = z.object({
  id: z.string(),
  patient_id: z.string(),              // User.id of the patient
  doctor_profile_id: z.string(),       // DoctorProfile.id (not User.id)
  slot_id: z.string(),                 // Slot.id from DoctorProfile.availability
  date: z.string(),                    // "YYYY-MM-DD"
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
  mode: z.enum(['in-person', 'video', 'phone']),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  /** ISO datetime set when the appointment is soft-deleted; absent on active records. */
  deleted_at: z.string().optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentDtoSchema = AppointmentSchema.omit({
  id: true,
  patient_id: true,
  status: true,
  created_at: true,
  updated_at: true,
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentDtoSchema>;

export const UpdateAppointmentStatusDtoSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed']),
});

export type UpdateAppointmentStatusDto = z.infer<typeof UpdateAppointmentStatusDtoSchema>;
