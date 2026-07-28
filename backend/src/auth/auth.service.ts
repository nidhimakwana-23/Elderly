import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { IUserRepository } from '../db/user.repository.js';
import type { LoginInput, SignupInput } from './auth.types.js';

// Number of salt rounds for bcrypt — higher is more secure but slower.
// 10 is the standard for most applications.
const SALT_ROUNDS = 10;

// ─── Custom error classes ──────────────────────────────────────────────────────
// These let the controller map errors to the correct HTTP status codes.

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return secret;
}

function issueToken(userId: string, email: string): string {
  const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '7d';
  // Cast needed because env vars are plain strings but jsonwebtoken's type
  // expects the branded StringValue type. The runtime value is identical.
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] & string };
  return jwt.sign({ sub: userId, email }, getJwtSecret(), options);
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  // Simple but sufficient check for learning purposes
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateBirthdate(birthdate: string): boolean {
  // Must be a valid date string in YYYY-MM-DD format
  const date = new Date(birthdate);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(birthdate);
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {
  // The service receives the repository through the constructor (dependency injection).
  // It never creates or imports a concrete repository itself.
  constructor(private readonly userRepository: IUserRepository) {}

  async signup(input: SignupInput): Promise<{ token: string }> {
    // 1. Validate inputs
    const { fullName, birthdate, email, password } = input;

    if (!fullName?.trim()) {
      throw new ValidationError('Full name is required.');
    }
    if (!email?.trim() || !validateEmail(email)) {
      throw new ValidationError('A valid email address is required.');
    }
    if (!birthdate?.trim() || !validateBirthdate(birthdate)) {
      throw new ValidationError('A valid birthdate (YYYY-MM-DD) is required.');
    }
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters.');
    }

    // 2. Check for duplicate email
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    // 3. Hash password & create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await this.userRepository.create({
      id: randomUUID(),
      fullName: fullName.trim(),
      birthdate,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    // 4. Issue JWT
    const token = issueToken(newUser.id, newUser.email);
    return { token };
  }

  async login(input: LoginInput): Promise<{ token: string }> {
    // 1. Validate inputs
    const { email, password } = input;

    if (!email?.trim()) {
      throw new ValidationError('Email is required.');
    }
    if (!password) {
      throw new ValidationError('Password is required.');
    }

    // 2. Find user — always use a generic message to avoid leaking whether
    //    the email exists in the system (security best practice).
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Compare password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 4. Issue JWT
    const token = issueToken(user.id, user.email);
    return { token };
  }
}
