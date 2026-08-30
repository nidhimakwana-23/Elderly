import type { Medicine } from '../../medicine/medicine.types';
import type { IMedicineRepository } from '../medicine.repository';
import { MedicineModel } from './medicine.model';

/**
 * MongooseMedicineRepository — persists Medicines in MongoDB.
 *
 * Implements IMedicineRepository as a drop-in for the removed
 * MemoryMedicineRepository.
 *
 * All queries use the app-level `id` field (UUID string), not MongoDB's _id.
 * `.select('-_id -__v').lean<T>()` strips Mongoose internals and returns a
 * plain object that exactly matches the domain type.
 */
export class MongooseMedicineRepository implements IMedicineRepository {
  async create(medicine: Medicine): Promise<Medicine> {
    await MedicineModel.create(medicine);
    return medicine;
  }

  async findById(id: string): Promise<Medicine | undefined> {
    const doc = await MedicineModel.findOne({ id })
      .select('-_id -__v')
      .lean<Medicine>();
    return doc ?? undefined;
  }

  async findAll(patient_id: string): Promise<Medicine[]> {
    return MedicineModel.find({ patient_id })
      .select('-_id -__v')
      .lean<Medicine[]>();
  }

  async update(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined> {
    const doc = await MedicineModel.findOneAndUpdate(
      { id },
      { $set: { ...updates, updated_at: new Date().toISOString() } },
      { new: true }
    )
      .select('-_id -__v')
      .lean<Medicine>();
    return doc ?? undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await MedicineModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
