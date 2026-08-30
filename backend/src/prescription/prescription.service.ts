import { randomUUID } from 'node:crypto';
import type { IPrescriptionRepository } from '../db/prescription.repository';
import type {
  CreatePrescriptionDto,
  Prescription,
  UpdatePrescriptionDto,
} from './prescription.types';

export class NotFoundError extends Error {
  constructor(msg = 'Not found.') { super(msg); this.name = 'NotFoundError'; }
}

export class ForbiddenError extends Error {
  constructor(msg = 'Forbidden.') { super(msg); this.name = 'ForbiddenError'; }
}

export class PrescriptionService {
  constructor(private readonly repo: IPrescriptionRepository) {}

  /**
   * Doctor creates a prescription.
   * doctor_id is always sourced from the JWT — never from the request body.
   */
  async createPrescription(doctorId: string, dto: CreatePrescriptionDto): Promise<Prescription> {
    const now = new Date().toISOString();
    const prescription: Prescription = {
      ...dto,
      id: randomUUID(),
      doctor_id: doctorId,
      medications: dto.medications,
      issued_at: dto.issued_at ?? now,
      created_at: now,
      updated_at: now,
    };
    return this.repo.create(prescription);
  }

  async getPrescriptionById(id: string): Promise<Prescription | undefined> {
    return this.repo.findById(id);
  }

  async getPrescriptionsForPatient(patientId: string): Promise<Prescription[]> {
    return this.repo.findByPatientId(patientId);
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    return this.repo.findByDoctorId(doctorId);
  }

  /**
   * Doctor updates a prescription.
   * Enforces ownership: only the authoring doctor can modify.
   */
  async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDto,
    requestingDoctorId: string,
  ): Promise<Prescription> {
    const prescription = await this.repo.findById(id);
    if (!prescription) throw new NotFoundError('Prescription not found.');
    if (prescription.doctor_id !== requestingDoctorId) {
      throw new ForbiddenError('You can only edit prescriptions that you authored.');
    }
    const updated = await this.repo.update(id, dto as Partial<Prescription>);
    return updated!;
  }

  /**
   * Doctor soft-deletes a prescription.
   * Enforces ownership: only the authoring doctor can delete.
   * Sets deleted_at; the record is retained in MongoDB for audit purposes.
   */
  async deletePrescription(id: string, requestingDoctorId: string): Promise<void> {
    const prescription = await this.repo.findById(id);
    if (!prescription) throw new NotFoundError('Prescription not found.');
    if (prescription.doctor_id !== requestingDoctorId) {
      throw new ForbiddenError('You can only delete prescriptions that you authored.');
    }
    await this.repo.softDelete(id);
  }
}
