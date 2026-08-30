import type { Medicine } from '../medicine/medicine.types';

export interface IMedicineRepository {
  create(medicine: Medicine): Promise<Medicine>;
  findById(id: string): Promise<Medicine | undefined>;
  findAll(patient_id: string): Promise<Medicine[]>;
  update(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined>;
  /** Permanently removes the document. Prefer softDelete for recoverable deletes. */
  delete(id: string): Promise<boolean>;
  /** Sets deleted_at to the current timestamp; the document remains in the DB. */
  softDelete(id: string): Promise<boolean>;
}
