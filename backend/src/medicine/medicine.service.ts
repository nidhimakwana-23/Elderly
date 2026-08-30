import type { IMedicineRepository } from '../db/medicine.repository';
import type { CreateMedicineDto, Medicine, UpdateMedicineDto } from './medicine.types';
import { randomUUID } from 'node:crypto';

export class MedicineService {
  constructor(private readonly repo: IMedicineRepository) {}

  async createMedicine(patient_id: string, dto: CreateMedicineDto): Promise<Medicine> {
    const medicine: Medicine = {
      ...dto,
      id: randomUUID(),
      patient_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.repo.create(medicine);
  }

  async getMedicines(patient_id: string): Promise<Medicine[]> {
    return this.repo.findAll(patient_id);
  }

  async getMedicineById(id: string): Promise<Medicine | undefined> {
    return this.repo.findById(id);
  }

  async updateMedicine(id: string, dto: UpdateMedicineDto): Promise<Medicine | undefined> {
    return this.repo.update(id, dto);
  }

  async deleteMedicine(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
