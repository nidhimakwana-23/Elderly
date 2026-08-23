import { z } from 'zod';

export const FamilyProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),           // The family member's own User ID
  linkedToUserId: z.string(),   // The ID of the normal user who created this profile
  medicalCondition: z.string(),
  emergencyContacts: z.array(z.string()),
  // Enriched from the User record — not stored on the profile document itself
  fullName: z.string().optional(),
  email: z.string().optional(),
});

export type FamilyProfile = z.infer<typeof FamilyProfileSchema>;

export const CreateFamilyProfileInputSchema = z.object({
  fullName: z.string(),
  birthDate: z.string().refine((val) => {
    const birth = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear() - ((now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) ? 1 : 0);
    return age >= 45;
  }, { message: 'You must be at least 45 years old' }),
  email: z.email(),
  password: z.string().optional()
    .refine(val => !val || (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[\\W_]/.test(val)), { message: 'Password must be at least 8 characters, include an uppercase letter, a number, and a special character' }),
  medicalConditions: z.array(z.string()),
  emergencyContacts: z.array(
    z.object({
      name: z.string(),
      phone: z.string(),
      relation: z.string(),
    })
  ),
});

export type CreateFamilyProfileInput = z.infer<typeof CreateFamilyProfileInputSchema>;
