import type { Prescription } from '../prescription/prescription.types.js';

export interface IPrescriptionRepository {
  create(prescription: Prescription): Promise<Prescription>;
  findById(id: string): Promise<Prescription | undefined>;
  findByPatientId(patient_id: string): Promise<Prescription[]>;
  findByDoctorId(doctor_id: string): Promise<Prescription[]>;
  update(id: string, data: Partial<Prescription>): Promise<Prescription | undefined>;
  delete(id: string): Promise<boolean>;
}
