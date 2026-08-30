import type { IPrescriptionRepository } from '../prescription.repository.js';
import type { Prescription } from '../../prescription/prescription.types.js';
import { PrescriptionModel } from './prescription.model.js';
import { ACTIVE_FILTER, buildSoftDeleteUpdate } from './soft-delete.js';

/** Converts a Mongoose document to a plain domain object. */
function toPlain(doc: any): Prescription {
  const obj = doc.toObject();
  return {
    id:             obj.id,
    patient_id:     obj.patient_id,
    doctor_id:      obj.doctor_id,
    appointment_id: obj.appointment_id,
    diagnosis:      obj.diagnosis,
    medications:    obj.medications,
    notes:          obj.notes,
    issued_at:      obj.issued_at,
    valid_until:    obj.valid_until,
    created_at:     obj.created_at,
    updated_at:     obj.updated_at,
    deleted_at:     obj.deleted_at ?? undefined,
  };
}

export class MongoosePrescriptionRepository implements IPrescriptionRepository {
  async create(prescription: Prescription): Promise<Prescription> {
    const doc = await PrescriptionModel.create(prescription);
    return toPlain(doc);
  }

  /** Returns a prescription only if it has NOT been soft-deleted. */
  async findById(id: string): Promise<Prescription | undefined> {
    const doc = await PrescriptionModel.findOne({ id, ...ACTIVE_FILTER });
    return doc ? toPlain(doc) : undefined;
  }

  /** Returns only active (non-deleted) prescriptions for the given patient. */
  async findByPatientId(patient_id: string): Promise<Prescription[]> {
    const docs = await PrescriptionModel
      .find({ patient_id, ...ACTIVE_FILTER })
      .sort({ issued_at: -1 });
    return docs.map(toPlain);
  }

  /** Returns only active (non-deleted) prescriptions authored by the given doctor. */
  async findByDoctorId(doctor_id: string): Promise<Prescription[]> {
    const docs = await PrescriptionModel
      .find({ doctor_id, ...ACTIVE_FILTER })
      .sort({ issued_at: -1 });
    return docs.map(toPlain);
  }

  async update(id: string, data: Partial<Prescription>): Promise<Prescription | undefined> {
    const doc = await PrescriptionModel.findOneAndUpdate(
      { id, ...ACTIVE_FILTER },
      { ...data, updated_at: new Date().toISOString() },
      { new: true },
    );
    return doc ? toPlain(doc) : undefined;
  }

  /**
   * Soft-delete: stamps `deleted_at` with the current ISO timestamp.
   * The document is retained in MongoDB and can be audited or restored.
   * Returns true if a matching active record was found and marked.
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await PrescriptionModel.updateOne(
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
    const result = await PrescriptionModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
