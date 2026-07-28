import type { IAppointmentRepository } from '../appointment.repository.js';
import type { Appointment } from '../../appointment/appointment.types.js';
import { AppointmentModel } from './appointment.model.js';

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
  };
}

export class MongooseAppointmentRepository implements IAppointmentRepository {
  async create(appointment: Appointment): Promise<Appointment> {
    const doc = await AppointmentModel.create(appointment);
    return toPlain(doc);
  }

  async findById(id: string): Promise<Appointment | undefined> {
    const doc = await AppointmentModel.findOne({ id });
    return doc ? toPlain(doc) : undefined;
  }

  async findByPatientId(patient_id: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({ patient_id }).sort({ date: -1 });
    return docs.map(toPlain);
  }

  async findByDoctorProfileId(doctor_profile_id: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({ doctor_profile_id }).sort({ date: -1 });
    return docs.map(toPlain);
  }

  async updateStatus(id: string, status: string): Promise<Appointment | undefined> {
    const doc = await AppointmentModel.findOneAndUpdate(
      { id },
      { status, updated_at: new Date().toISOString() },
      { new: true }
    );
    return doc ? toPlain(doc) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await AppointmentModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
