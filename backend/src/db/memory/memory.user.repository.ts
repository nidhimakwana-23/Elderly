import type { User } from '../../auth/auth.types.js';
import type { IUserRepository } from '../user.repository.js';

import type { FamilyProfile } from '../../family/family.types.js';

/**
 * MemoryUserRepository — stores users in a plain JavaScript Map.
 *
 * ⚠️  All data is lost when the server restarts. This is intentional for
 * learning — no database setup required.
 *
 * To replace with a real database later:
 *   1. Create e.g. `src/db/postgres/postgres.user.repository.ts`
 *   2. Implement the IUserRepository interface there
 *   3. In server.ts, swap `new MemoryUserRepository()` for the new class.
 *   That's it — nothing else changes.
 */

export class MemoryUserRepository implements IUserRepository {
  // Key: user id  →  Value: User record
  private readonly store = new Map<string, User>();
  // Key: profile id → Value: FamilyProfile record
  private readonly familyStore = new Map<string, FamilyProfile>();

  async findByEmail(email: string): Promise<User | undefined> {
    for (const user of this.store.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async create(user: User): Promise<User> {
    this.store.set(user.id, user);
    return user;
  }

  async createFamilyProfile(profile: FamilyProfile): Promise<FamilyProfile> {
    this.familyStore.set(profile.id, profile);
    return profile;
  }

  async getFamilyProfilesByUserId(linkedToUserId: string): Promise<FamilyProfile[]> {
    const profiles: FamilyProfile[] = [];
    for (const profile of this.familyStore.values()) {
      if (profile.linkedToUserId === linkedToUserId) {
        profiles.push(profile);
      }
    }
    return profiles;
  }
}