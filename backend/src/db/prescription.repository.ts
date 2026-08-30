import type { Prescription } from '../prescription/prescription.types';

export interface IPrescriptionRepository {
  create(prescription: Prescription): Promise<Prescription>;
  findById(id: string): Promise<Prescription | undefined>;
  findByPatientId(patient_id: string): Promise<Prescription[]>;
  findByDoctorId(doctor_id: string): Promise<Prescription[]>;
  update(id: string, data: Partial<Prescription>): Promise<Prescription | undefined>;
  /** Permanently removes the document. Prefer softDelete for recoverable deletes. */
  delete(id: string): Promise<boolean>;
  /** Sets deleted_at to the current timestamp; the document remains in the DB. */
  softDelete(id: string): Promise<boolean>;
}
