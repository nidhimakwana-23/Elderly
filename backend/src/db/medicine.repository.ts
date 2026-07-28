import type { Medicine } from '../medicine/medicine.types.js';

export interface IMedicineRepository {
  create(medicine: Medicine): Promise<Medicine>;
  findById(id: string): Promise<Medicine | undefined>;
  findAll(patient_id: string): Promise<Medicine[]>;
  update(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined>;
  delete(id: string): Promise<boolean>;
}
