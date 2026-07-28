import type { User } from '../../auth/auth.types.js';
import type { FamilyProfile } from '../../family/family.types.js';
import type { IUserRepository } from '../user.repository.js';
import { UserModel } from './user.model.js';
import { FamilyProfileModel } from './family-profile.model.js';

/**
 * MongooseUserRepository — persists Users and FamilyProfiles in MongoDB.
 *
 * Implements IUserRepository so it is a drop-in replacement for the
 * removed MemoryUserRepository. Services and controllers are unaware of
 * which implementation is in use.
 *
 * ID strategy: Option A — app-level UUIDs stored as a plain `id` string
 * field. MongoDB's native `_id` is never exposed to the service layer.
 * `.lean()` returns plain JS objects; we assert them directly to the domain
 * types since the schema fields are an exact match.
 */
export class MongooseUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | undefined> {
    const doc = await UserModel.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    })
      .select('-_id -__v')
      .lean<User>();
    return doc ?? undefined;
  }

  async create(user: User): Promise<User> {
    await UserModel.create(user);
    return user;
  }

  async createFamilyProfile(profile: FamilyProfile): Promise<FamilyProfile> {
    await FamilyProfileModel.create(profile);
    return profile;
  }

  async getFamilyProfilesByUserId(linkedToUserId: string): Promise<FamilyProfile[]> {
    return FamilyProfileModel.find({ linkedToUserId })
      .select('-_id -__v')
      .lean<FamilyProfile[]>();
  }
}
