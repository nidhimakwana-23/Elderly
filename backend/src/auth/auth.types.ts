import { z } from 'zod';

// ─── Stored user record ───────────────────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  birthdate: z.string().refine((val) => {
    const birth = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear() - ((now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) ? 1 : 0);
    return age >= 18;
  }, { message: 'You must be at least 18 years old' }), // ISO 8601 date string e.g. "1990-05-14"
  email: z.email(),
  passwordHash: z.string(),
  phone: z.string().optional(),
  createdAt: z.string(), // ISO 8601 datetime string
  role: z.enum(['normal', 'family', 'doctor']).optional(),
});

export type User = z.infer<typeof UserSchema>;

// ─── API input shapes ─────────────────────────────────────────────────────────
export const SignupInputSchema = z.object({
  fullName: z.string(),
  birthdate: z.string().refine((val) => {
    const birth = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear() - ((now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) ? 1 : 0);
    return age >= 18;
  }, { message: 'You must be at least 18 years old' }),
  email: z.string(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(val => /[A-Z]/.test(val), { message: 'Password must contain at least one uppercase letter' })
    .refine(val => /[0-9]/.test(val), { message: 'Password must contain at least one number' })
    .refine(val => /[\\W_]/.test(val), { message: 'Password must contain at least one special character' }),
  phone: z.string().optional(),
});

// ─── Doctor signup input ──────────────────────────────────────────────────────
export const DoctorSignupInputSchema = z.object({
  fullName: z.string(),
  birthdate: z.string().refine((val) => {
    const birth = new Date(val);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear() - ((now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) ? 1 : 0);
    return age >= 18;
  }, { message: 'You must be at least 18 years old' }),
  email: z.string(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(val => /[A-Z]/.test(val), { message: 'Password must contain at least one uppercase letter' })
    .refine(val => /[0-9]/.test(val), { message: 'Password must contain at least one number' })
    .refine(val => /[\\W_]/.test(val), { message: 'Password must contain at least one special character' }),
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
