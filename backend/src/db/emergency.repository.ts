import type { EmergencyRequest } from '../emergency/emergency.types';

export interface IEmergencyRepository {
  create(request: EmergencyRequest): Promise<EmergencyRequest>;
  findById(id: string): Promise<EmergencyRequest | undefined>;
  findOpenNearby(longitude: number, latitude: number, radiusMeters: number): Promise<EmergencyRequest[]>;
  findByPatientId(patient_id: string): Promise<EmergencyRequest[]>;
  updateStatus(
    id: string,
    status: string,
    extra?: Partial<EmergencyRequest>,
  ): Promise<EmergencyRequest | undefined>;
}
