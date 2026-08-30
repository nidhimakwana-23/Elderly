import type { IHealthCheckRepository } from '../health-check.repository.js';
import type { HealthCheck } from '../../health-check/health-check.types.js';
import { HealthCheckModel } from './health-check.model.js';
import { ACTIVE_FILTER, buildSoftDeleteUpdate } from './soft-delete.js';

export class MongooseHealthCheckRepository implements IHealthCheckRepository {
  async create(healthCheck: HealthCheck): Promise<HealthCheck> {
    const document = new HealthCheckModel({
      ...healthCheck,
      _id: healthCheck.id,
    });
    await document.save();
    return this.mapToDomain(document);
  }

  /** Returns a health-check only if it has NOT been soft-deleted. */
  async findById(id: string): Promise<HealthCheck | undefined> {
    const document = await HealthCheckModel.findOne({ _id: id, ...ACTIVE_FILTER });
    return document ? this.mapToDomain(document) : undefined;
  }

  /** Returns only active (non-deleted) health-checks for the given patient. */
  async findAll(patient_id: string): Promise<HealthCheck[]> {
    const documents = await HealthCheckModel
      .find({ patient_id, ...ACTIVE_FILTER })
      .sort({ date: -1 });
    return documents.map(this.mapToDomain);
  }

  async update(id: string, updates: Partial<HealthCheck>): Promise<HealthCheck | undefined> {
    const document = await HealthCheckModel.findOneAndUpdate(
      { _id: id, ...ACTIVE_FILTER },
      { $set: updates },
      { new: true },
    );
    return document ? this.mapToDomain(document) : undefined;
  }

  /**
   * Soft-delete: stamps `deleted_at` with the current ISO timestamp.
   * Returns true if a matching active record was found and marked.
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await HealthCheckModel.updateOne(
      { _id: id, ...ACTIVE_FILTER },
      buildSoftDeleteUpdate(),
    );
    return result.modifiedCount === 1;
  }

  /**
   * Hard-delete: permanently removes the document from MongoDB.
   * Use only when a physical purge is required (e.g. GDPR erasure).
   */
  async delete(id: string): Promise<boolean> {
    const result = await HealthCheckModel.findByIdAndDelete(id);
    return result !== null;
  }

  private mapToDomain(doc: any): HealthCheck {
    return {
      id:             doc._id,
      patient_id:     doc.patient_id,
      recorded_by_id: doc.recorded_by_id,
      sugar_level:    doc.sugar_level,
      weight:         doc.weight,
      blood_pressure: doc.blood_pressure,
      blood_level:    doc.blood_level,
      bmi:            doc.bmi,
      date:           doc.date,
      notes:          doc.notes,
      created_at:     doc.created_at,
      updated_at:     doc.updated_at,
      deleted_at:     doc.deleted_at ?? undefined,
    };
  }
}
