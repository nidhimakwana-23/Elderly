import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { IUserRepository } from '../db/user.repository.js';
import type { CreateFamilyProfileInput, FamilyProfile } from './family.types.js';

const SALT_ROUNDS = 10;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateBirthdate(birthdate: string): boolean {
  const date = new Date(birthdate);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(birthdate);
}

export class FamilyService {
  constructor(private readonly userRepository: IUserRepository) { }

  async createFamilyProfile(
    input: CreateFamilyProfileInput,
    linkedToUserId: string
  ): Promise<{ profile: FamilyProfile; userId: string }> {
    const { fullName, birthdate, email, password, medicalCondition, emergencyContacts } = input;

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

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the User record so they can log in
    const newUser = await this.userRepository.create({
      id: randomUUID(),
      fullName: fullName.trim(),
      birthdate,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      role: 'family',
    });

    // Create the Family Profile linked to both users
    const profileId = randomUUID();
    const newProfile = await this.userRepository.createFamilyProfile({
      id: profileId,
      userId: newUser.id,
      linkedToUserId,
      medicalCondition: medicalCondition || '',
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
    });

    return { profile: newProfile, userId: newUser.id };
  }

  async getFamilyProfiles(userId: string): Promise<FamilyProfile[]> {
    return this.userRepository.getFamilyProfilesByUserId(userId);
  }
}
