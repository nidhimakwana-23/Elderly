import { z } from 'zod';

// ─── Availability Slot ─────────────────────────────────────────────────────────
export const SlotSchema = z.object({
  id: z.string(),
  day_of_week: z.number().int().min(0).max(6), // 0 = Sunday … 6 = Saturday
  start_time: z.string(),                       // "HH:MM" e.g. "09:00"
  end_time: z.string(),                         // "HH:MM" e.g. "10:00"
  is_booked: z.boolean().default(false),
});

export type Slot = z.infer<typeof SlotSchema>;

// ─── Doctor Profile ────────────────────────────────────────────────────────────
export const DoctorProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),           // references User.id
  specialization: z.string(),
  license_number: z.string(),
  phone: z.string(),
  bio: z.string().optional(),
  /** GeoJSON Point — coordinates are [longitude, latitude] */
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  availability: z.array(SlotSchema).default([]),
  is_available_for_emergency: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DoctorProfile = z.infer<typeof DoctorProfileSchema>;

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export const CreateDoctorProfileDtoSchema = DoctorProfileSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export type CreateDoctorProfileDto = z.infer<typeof CreateDoctorProfileDtoSchema>;

export const UpdateDoctorProfileDtoSchema = CreateDoctorProfileDtoSchema.partial();

export type UpdateDoctorProfileDto = z.infer<typeof UpdateDoctorProfileDtoSchema>;

export const UpdateAvailabilityDtoSchema = z.object({
  availability: z.array(SlotSchema),
});

export type UpdateAvailabilityDto = z.infer<typeof UpdateAvailabilityDtoSchema>;
