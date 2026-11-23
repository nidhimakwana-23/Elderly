import type { User } from '../auth/auth.types';

import type { FamilyProfile } from '../family/family.types';

/**
 * IUserRepository — the contract for all user storage implementations.
 *
 * The auth service only ever depends on this interface, never on a concrete
 * class. That means you can swap the in-memory store for PostgreSQL, MongoDB,
 * or anything else by creating a new class that satisfies this interface and
 * updating the single injection point in server.ts.
 */
export interface IUserRepository {
  /** Find a user by their email address. Returns undefined if not found. */
  findByEmail(email: string): Promise<User | undefined>;

  /** Persist a new user record and return it. */
  create(user: User): Promise<User>;

  /** Persist a new family profile. */
  createFamilyProfile(profile: FamilyProfile): Promise<FamilyProfile>;

  /** Get all family profiles linked to a given user ID. */
  getFamilyProfilesByUserId(linkedToUserId: string): Promise<FamilyProfile[]>;

  /** Find a user by their user ID. Returns undefined if not found. */
  findById?(id: string): Promise<User | undefined>;

  /** Get IDs of all caregivers linked to this patient. */
  getLinkedCaregiverIds?(patientId: string): Promise<string[]>;

  /** Get IDs of all patients linked to this caregiver. */
  getLinkedPatientIds?(caregiverId: string): Promise<string[]>;
}
