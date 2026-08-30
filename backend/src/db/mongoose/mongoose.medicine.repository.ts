import type { Medicine } from '../../medicine/medicine.types.js';
import type { IMedicineRepository } from '../medicine.repository.js';
import { MedicineModel } from './medicine.model.js';
import { ACTIVE_FILTER, buildSoftDeleteUpdate } from './soft-delete.js';

/**
 * MongooseMedicineRepository — persists Medicines in MongoDB.
 *
 * All queries use the app-level `id` field (UUID string), not MongoDB's _id.
 * Active records are distinguished from soft-deleted ones via ACTIVE_FILTER.
 */
export class MongooseMedicineRepository implements IMedicineRepository {
  async create(medicine: Medicine): Promise<Medicine> {
    await MedicineModel.create(medicine);
    return medicine;
  }

  /** Returns a medicine only if it has NOT been soft-deleted. */
  async findById(id: string): Promise<Medicine | undefined> {
    const doc = await MedicineModel.findOne({ id, ...ACTIVE_FILTER })
      .select('-_id -__v')
      .lean<Medicine>();
    return doc ?? undefined;
  }

  /** Returns only active (non-deleted) medicines for the given patient. */
  async findAll(patient_id: string): Promise<Medicine[]> {
    return MedicineModel.find({ patient_id, ...ACTIVE_FILTER })
      .select('-_id -__v')
      .lean<Medicine[]>();
  }

  async update(id: string, updates: Partial<Medicine>): Promise<Medicine | undefined> {
    const doc = await MedicineModel.findOneAndUpdate(
      { id, ...ACTIVE_FILTER },
      { $set: { ...updates, updated_at: new Date().toISOString() } },
      { new: true },
    )
      .select('-_id -__v')
      .lean<Medicine>();
    return doc ?? undefined;
  }

  /**
   * Soft-delete: stamps `deleted_at` with the current ISO timestamp.
   * Returns true if a matching active record was found and marked.
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await MedicineModel.updateOne(
      { id, ...ACTIVE_FILTER },
      buildSoftDeleteUpdate(),
    );
    return result.modifiedCount === 1;
  }

  /**
   * Hard-delete: permanently removes the document from MongoDB.
   * Use only when a physical purge is required (e.g. GDPR erasure).
   */
  async delete(id: string): Promise<boolean> {
    const result = await MedicineModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
