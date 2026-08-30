import type { IAppointmentRepository } from '../appointment.repository.js';
import type { Appointment } from '../../appointment/appointment.types.js';
import { AppointmentModel } from './appointment.model.js';
import { ACTIVE_FILTER, buildSoftDeleteUpdate } from './soft-delete.js';

function toPlain(doc: any): Appointment {
  const obj = doc.toObject();
  return {
    id:                obj.id,
    patient_id:        obj.patient_id,
    doctor_profile_id: obj.doctor_profile_id,
    slot_id:           obj.slot_id,
    date:              obj.date,
    status:            obj.status,
    mode:              obj.mode,
    notes:             obj.notes,
    created_at:        obj.created_at,
    updated_at:        obj.updated_at,
    deleted_at:        obj.deleted_at ?? undefined,
  };
}

export class MongooseAppointmentRepository implements IAppointmentRepository {
  async create(appointment: Appointment): Promise<Appointment> {
    const doc = await AppointmentModel.create(appointment);
    return toPlain(doc);
  }

  /** Returns an appointment only if it has NOT been soft-deleted. */
  async findById(id: string): Promise<Appointment | undefined> {
    const doc = await AppointmentModel.findOne({ id, ...ACTIVE_FILTER });
    return doc ? toPlain(doc) : undefined;
  }

  /** Returns only active (non-deleted) appointments for the given patient. */
  async findByPatientId(patient_id: string): Promise<Appointment[]> {
    const docs = await AppointmentModel
      .find({ patient_id, ...ACTIVE_FILTER })
      .sort({ date: -1 });
    return docs.map(toPlain);
  }

  /** Returns only active (non-deleted) appointments for the given doctor profile. */
  async findByDoctorProfileId(doctor_profile_id: string): Promise<Appointment[]> {
    const docs = await AppointmentModel
      .find({ doctor_profile_id, ...ACTIVE_FILTER })
      .sort({ date: -1 });
    return docs.map(toPlain);
  }

  async updateStatus(id: string, status: string): Promise<Appointment | undefined> {
    const doc = await AppointmentModel.findOneAndUpdate(
      { id, ...ACTIVE_FILTER },
      { status, updated_at: new Date().toISOString() },
      { new: true },
    );
    return doc ? toPlain(doc) : undefined;
  }

  /**
   * Soft-delete: stamps `deleted_at` with the current ISO timestamp.
   * Returns true if a matching active record was found and marked.
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await AppointmentModel.updateOne(
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
    const result = await AppointmentModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
