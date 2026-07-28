import { z } from 'zod';

// ─── Stored user record ───────────────────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  birthdate: z.string(), // ISO 8601 date string e.g. "1990-05-14"
  email: z.string(),
  passwordHash: z.string(),
  phone: z.string().optional(),
  createdAt: z.string(), // ISO 8601 datetime string
  role: z.enum(['normal', 'family', 'doctor']).optional(),
});

export type User = z.infer<typeof UserSchema>;

// ─── API input shapes ─────────────────────────────────────────────────────────
export const SignupInputSchema = z.object({
  fullName: z.string(),
  birthdate: z.string(),
  email: z.string(),
  password: z.string(),
  phone: z.string().optional(),
});

// ─── Doctor signup input ──────────────────────────────────────────────────────
export const DoctorSignupInputSchema = z.object({
  fullName: z.string(),
  birthdate: z.string(),
  email: z.string(),
  password: z.string(),
  phone: z.string(),
  licenseNumber: z.string(),
  specialization: z.string(),
});

export type DoctorSignupInput = z.infer<typeof DoctorSignupInputSchema>;

export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

// ─── JWT payload ──────────────────────────────────────────────────────────────
export const JwtPayloadSchema = z.object({
  sub: z.string(),   // user id
  email: z.string(),
  role: z.enum(['normal', 'family', 'doctor']).optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
