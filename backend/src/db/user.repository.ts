import type { User } from '../auth/auth.types.js';

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
}
