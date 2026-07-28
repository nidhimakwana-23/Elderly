import type { IEmergencyRepository } from '../emergency.repository.js';
import type { EmergencyRequest } from '../../emergency/emergency.types.js';
import { EmergencyModel } from './emergency.model.js';

function toPlain(doc: any): EmergencyRequest {
  const obj = doc.toObject();
  return {
    id:                    obj.id,
    patient_id:            obj.patient_id,
    location:              obj.location,
    description:           obj.description,
    status:                obj.status,
    accepted_by_doctor_id: obj.accepted_by_doctor_id,
    accepted_at:           obj.accepted_at,
    resolved_at:           obj.resolved_at,
    created_at:            obj.created_at,
    updated_at:            obj.updated_at,
  };
}

export class MongooseEmergencyRepository implements IEmergencyRepository {
  async create(request: EmergencyRequest): Promise<EmergencyRequest> {
    const doc = await EmergencyModel.create(request);
    return toPlain(doc);
  }

  async findById(id: string): Promise<EmergencyRequest | undefined> {
    const doc = await EmergencyModel.findOne({ id });
    return doc ? toPlain(doc) : undefined;
  }

  async findOpenNearby(
    longitude: number,
    latitude: number,
    radiusMeters: number,
  ): Promise<EmergencyRequest[]> {
    const docs = await EmergencyModel.find({
      status: 'open',
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusMeters,
        },
      },
    }).limit(50);
    return docs.map(toPlain);
  }

  async findByPatientId(patient_id: string): Promise<EmergencyRequest[]> {
    const docs = await EmergencyModel.find({ patient_id }).sort({ created_at: -1 });
    return docs.map(toPlain);
  }

  async updateStatus(
    id: string,
    status: string,
    extra: Partial<EmergencyRequest> = {},
  ): Promise<EmergencyRequest | undefined> {
    const doc = await EmergencyModel.findOneAndUpdate(
      { id },
      { status, ...extra, updated_at: new Date().toISOString() },
      { new: true }
    );
    return doc ? toPlain(doc) : undefined;
  }
}
