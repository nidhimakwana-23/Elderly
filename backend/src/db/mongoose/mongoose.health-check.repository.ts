import type { IHealthCheckRepository } from '../health-check.repository';
import type { HealthCheck } from '../../health-check/health-check.types';
import { HealthCheckModel } from './health-check.model';

export class MongooseHealthCheckRepository implements IHealthCheckRepository {
  async create(healthCheck: HealthCheck): Promise<HealthCheck> {
    const document = new HealthCheckModel({
      ...healthCheck,
      _id: healthCheck.id,
    });
    await document.save();
    return this.mapToDomain(document);
  }

  async findById(id: string): Promise<HealthCheck | undefined> {
    const document = await HealthCheckModel.findById(id);
    return document ? this.mapToDomain(document) : undefined;
  }

  async findAll(patient_id: string): Promise<HealthCheck[]> {
    const documents = await HealthCheckModel.find({ patient_id }).sort({ date: -1 });
    return documents.map(this.mapToDomain);
  }

  async update(id: string, updates: Partial<HealthCheck>): Promise<HealthCheck | undefined> {
    const document = await HealthCheckModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true } // Return the updated document
    );
    return document ? this.mapToDomain(document) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await HealthCheckModel.findByIdAndDelete(id);
    return result !== null;
  }

  private mapToDomain(doc: any): HealthCheck {
    return {
      id: doc._id,
      patient_id: doc.patient_id,
      recorded_by_id: doc.recorded_by_id,
      sugar_level: doc.sugar_level,
      weight: doc.weight,
      blood_pressure: doc.blood_pressure,
      blood_level: doc.blood_level,
      bmi: doc.bmi,
      date: doc.date,
      notes: doc.notes,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }
}
