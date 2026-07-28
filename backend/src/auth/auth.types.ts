// ─── Stored user record ───────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  birthdate: string; // ISO 8601 date string e.g. "1990-05-14"
  email: string;
  passwordHash: string;
  createdAt: string; // ISO 8601 datetime string
  role?: 'normal' | 'family';
}

// ─── API input shapes ─────────────────────────────────────────────────────────
export interface SignupInput {
  fullName: string;
  birthdate: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── JWT payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string; // user id
  email: string;
}
