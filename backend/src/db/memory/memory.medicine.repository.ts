import type { Medicine } from '../../medicine/medicine.types.js';
import type { IMedicineRepository } from '../medicine.repository.js';

export class MemoryMedicineRepository implements IMedicineRepository {
  private readonly store = new Map<string, Medicine>();

  async create(medicine: Medicine): Promise<Medicine> {
    this.store.set(medicine.id, medicine);
    return medicine;
  }

  async findById(id: string): Promise<Medicine | undefined> {
    return this.store.get(id);
  }

  async findAll(patient_id: string): Promise<Medicine[]> {
    const medicines: Medicine[] = [];
    for (const medicine of this.store.values()) {
      if (medicine.patient_id === patient_id) {
        medicines.push(medicine);
      }
    }
    return medicines;
  }

  async update(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined> {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
