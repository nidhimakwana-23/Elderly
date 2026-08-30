import { randomUUID } from 'node:crypto';
import type { IEmergencyRepository } from '../db/emergency.repository';
import type { CreateEmergencyDto, EmergencyRequest } from './emergency.types';

export class NotFoundError extends Error {
  constructor(msg = 'Not found.') { super(msg); this.name = 'NotFoundError'; }
}
export class ForbiddenError extends Error {
  constructor(msg = 'Forbidden.') { super(msg); this.name = 'ForbiddenError'; }
}
export class ConflictError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ConflictError'; }
}

export class EmergencyService {
  constructor(private readonly repo: IEmergencyRepository) {}

  /** Patient raises an emergency SOS. */
  async raiseEmergency(patientId: string, dto: CreateEmergencyDto): Promise<EmergencyRequest> {
    const now = new Date().toISOString();
    const request: EmergencyRequest = {
      ...dto,
      id: randomUUID(),
      patient_id: patientId,
      status: 'open',
      created_at: now,
      updated_at: now,
    };
    return this.repo.create(request);
  }

  /** Doctors fetch open emergencies near their location. */
  async getOpenNearby(longitude: number, latitude: number, radiusMeters = 10_000): Promise<EmergencyRequest[]> {
    return this.repo.findOpenNearby(longitude, latitude, radiusMeters);
  }

  /** Doctor accepts an emergency request. */
  async acceptEmergency(requestId: string, doctorProfileId: string): Promise<EmergencyRequest> {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError('Emergency request not found.');
    if (request.status !== 'open') {
      throw new ConflictError(`Cannot accept an emergency that is already "${request.status}".`);
    }
    const updated = await this.repo.updateStatus(requestId, 'accepted', {
      accepted_by_doctor_id: doctorProfileId,
      accepted_at: new Date().toISOString(),
    });
    return updated!;
  }

  /** Doctor resolves the emergency. */
  async resolveEmergency(requestId: string, doctorProfileId: string): Promise<EmergencyRequest> {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError('Emergency request not found.');
    if (request.accepted_by_doctor_id !== doctorProfileId) {
      throw new ForbiddenError('Only the doctor who accepted this emergency can resolve it.');
    }
    const updated = await this.repo.updateStatus(requestId, 'resolved', {
      resolved_at: new Date().toISOString(),
    });
    return updated!;
  }

  /** Patient cancels their own emergency request. */
  async cancelEmergency(requestId: string, patientId: string): Promise<EmergencyRequest> {
    const request = await this.repo.findById(requestId);
    if (!request) throw new NotFoundError('Emergency request not found.');
    if (request.patient_id !== patientId) {
      throw new ForbiddenError('You can only cancel your own emergency requests.');
    }
    if (['resolved', 'cancelled'].includes(request.status)) {
      throw new ConflictError(`Request is already "${request.status}".`);
    }
    const updated = await this.repo.updateStatus(requestId, 'cancelled');
    return updated!;
  }

  /** Get all emergency requests for a patient. */
  async getPatientEmergencies(patientId: string): Promise<EmergencyRequest[]> {
    return this.repo.findByPatientId(patientId);
  }
}
