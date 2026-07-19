import { z } from 'zod';

export const FamilyProfileSchema = z.object({
  id: z.string(),
  userId: z.string(), // The family member's own User ID
  linkedToUserId: z.string(), // The ID of the normal user who created this profile
  medicalCondition: z.string(),
  emergencyContacts: z.array(z.string()),
});

export type FamilyProfile = z.infer<typeof FamilyProfileSchema>;

export const CreateFamilyProfileInputSchema = z.object({
  fullName: z.string(),
  birthDate: z.string(),
  email: z.string(),
  password: z.string().optional(),
  medicalConditions: z.array(z.string()),
  emergencyContacts: z.array(
    z.object({
      name: z.string(),
      phone: z.string(),
      relation: z.string(),
    })
  ),
  nickname: z.string().optional(),
});

export type CreateFamilyProfileInput = z.infer<typeof CreateFamilyProfileInputSchema>;
