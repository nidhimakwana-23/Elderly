import { randomUUID } from 'node:crypto';
import type { IDoctorRepository } from '../db/doctor.repository';
import type {
  CreateDoctorProfileDto,
  DoctorProfile,
  UpdateAvailabilityDto,
  UpdateDoctorProfileDto,
} from './doctor.types';

export class NotFoundError extends Error {
  constructor(message = 'Resource not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DoctorService {
  constructor(private readonly repo: IDoctorRepository) {}

  /** Create a doctor profile (one per doctor user). */
  async createProfile(userId: string, dto: CreateDoctorProfileDto): Promise<DoctorProfile> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new ConflictError('A profile already exists for this doctor. Use PATCH to update.');
    }
    const now = new Date().toISOString();
    const profile: DoctorProfile = {
      ...dto,
      id: randomUUID(),
      user_id: userId,
      availability: dto.availability ?? [],
      is_available_for_emergency: dto.is_available_for_emergency ?? false,
      created_at: now,
      updated_at: now,
    };
    return this.repo.create(profile);
  }

  /** Get a doctor's profile by their user id. */
  async getProfileByUserId(userId: string): Promise<DoctorProfile | undefined> {
    return this.repo.findByUserId(userId);
  }

  /** Get a doctor's profile by the profile id (public). */
  async getProfileById(id: string): Promise<DoctorProfile | undefined> {
    return this.repo.findById(id);
  }

  /**
   * Search for nearby doctors using GeoJSON coordinates.
   * @param longitude  WGS-84 longitude
   * @param latitude   WGS-84 latitude
   * @param radius     Search radius in metres (default 10 km)
   */
  async searchNearby(
    longitude: number,
    latitude: number,
    radius = 10_000,
    specialization?: string,
  ): Promise<DoctorProfile[]> {
    return this.repo.findNearby(longitude, latitude, radius, specialization);
  }

  /** Replace the availability slots for the calling doctor. */
  async updateAvailability(profileId: string, dto: UpdateAvailabilityDto): Promise<DoctorProfile> {
    const updated = await this.repo.updateAvailability(profileId, dto);
    if (!updated) throw new NotFoundError('Doctor profile not found.');
    return updated;
  }

  /** Partially update doctor profile fields. */
  async updateProfile(profileId: string, dto: UpdateDoctorProfileDto): Promise<DoctorProfile> {
    const updated = await this.repo.update(profileId, dto as Partial<DoctorProfile>);
    if (!updated) throw new NotFoundError('Doctor profile not found.');
    return updated;
  }
}
