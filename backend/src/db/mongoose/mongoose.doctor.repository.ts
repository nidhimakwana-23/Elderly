import type { IDoctorRepository } from '../doctor.repository';
import type { DoctorProfile, UpdateAvailabilityDto } from '../../doctor/doctor.types';
import { DoctorProfileModel } from './doctor-profile.model';

function toPlain(doc: any): DoctorProfile {
  const obj = doc.toObject();
  return {
    id:                         obj.id,
    user_id:                    obj.user_id,
    specialization:             obj.specialization,
    license_number:             obj.license_number,
    phone:                      obj.phone,
    bio:                        obj.bio,
    location:                   obj.location,
    availability:               obj.availability ?? [],
    is_available_for_emergency: obj.is_available_for_emergency,
    created_at:                 obj.created_at,
    updated_at:                 obj.updated_at,
  };
}

export class MongooseDoctorRepository implements IDoctorRepository {
  async create(profile: DoctorProfile): Promise<DoctorProfile> {
    const doc = await DoctorProfileModel.create(profile);
    return toPlain(doc);
  }

  async findByUserId(user_id: string): Promise<DoctorProfile | undefined> {
    const doc = await DoctorProfileModel.findOne({ user_id });
    return doc ? toPlain(doc) : undefined;
  }

  async findById(id: string): Promise<DoctorProfile | undefined> {
    const doc = await DoctorProfileModel.findOne({ id });
    return doc ? toPlain(doc) : undefined;
  }

  async findNearby(
    longitude: number,
    latitude: number,
    radiusMeters: number,
    specialization?: string,
  ): Promise<DoctorProfile[]> {
    const query: Record<string, unknown> = {
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusMeters,
        },
      },
    };
    if (specialization) {
      query['specialization'] = { $regex: specialization, $options: 'i' };
    }
    const docs = await DoctorProfileModel.find(query).limit(50);
    return docs.map(toPlain);
  }

  async updateAvailability(id: string, dto: UpdateAvailabilityDto): Promise<DoctorProfile | undefined> {
    const doc = await DoctorProfileModel.findOneAndUpdate(
      { id },
      { availability: dto.availability, updated_at: new Date().toISOString() },
      { new: true }
    );
    return doc ? toPlain(doc) : undefined;
  }

  async update(id: string, data: Partial<DoctorProfile>): Promise<DoctorProfile | undefined> {
    const doc = await DoctorProfileModel.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date().toISOString() },
      { new: true }
    );
    return doc ? toPlain(doc) : undefined;
  }
}
