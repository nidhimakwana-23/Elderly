import type { DoctorProfile, UpdateAvailabilityDto } from '../doctor/doctor.types.js';

/**
 * IDoctorRepository — contract for all doctor profile storage implementations.
 */
export interface IDoctorRepository {
  /** Create a new doctor profile. */
  create(profile: DoctorProfile): Promise<DoctorProfile>;

  /** Find a doctor profile by the linked User id. */
  findByUserId(user_id: string): Promise<DoctorProfile | undefined>;

  /** Find a doctor profile by its own id. */
  findById(id: string): Promise<DoctorProfile | undefined>;

  /**
   * Find all doctors within `radiusMeters` of [longitude, latitude].
   * Optionally filter by specialization.
   */
  findNearby(
    longitude: number,
    latitude: number,
    radiusMeters: number,
    specialization?: string,
  ): Promise<DoctorProfile[]>;

  /** Replace the availability slots for a doctor profile. */
  updateAvailability(id: string, dto: UpdateAvailabilityDto): Promise<DoctorProfile | undefined>;

  /** Update any fields on the doctor profile. */
  update(id: string, data: Partial<DoctorProfile>): Promise<DoctorProfile | undefined>;
}
