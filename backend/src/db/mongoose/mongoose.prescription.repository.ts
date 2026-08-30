import type { IPrescriptionRepository } from '../prescription.repository';
import type { Prescription } from '../../prescription/prescription.types';
import { PrescriptionModel } from './prescription.model';

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
  };
}

export class MongoosePrescriptionRepository implements IPrescriptionRepository {
  async create(prescription: Prescription): Promise<Prescription> {
    const doc = await PrescriptionModel.create(prescription);
    return toPlain(doc);
  }

  async findById(id: string): Promise<Prescription | undefined> {
    const doc = await PrescriptionModel.findOne({ id });
    return doc ? toPlain(doc) : undefined;
  }

  async findByPatientId(patient_id: string): Promise<Prescription[]> {
    const docs = await PrescriptionModel.find({ patient_id }).sort({ issued_at: -1 });
    return docs.map(toPlain);
  }

  async findByDoctorId(doctor_id: string): Promise<Prescription[]> {
    const docs = await PrescriptionModel.find({ doctor_id }).sort({ issued_at: -1 });
    return docs.map(toPlain);
  }

  async update(id: string, data: Partial<Prescription>): Promise<Prescription | undefined> {
    const doc = await PrescriptionModel.findOneAndUpdate(
      { id },
      { ...data, updated_at: new Date().toISOString() },
      { new: true }
    );
    return doc ? toPlain(doc) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await PrescriptionModel.deleteOne({ id });
    return result.deletedCount === 1;
  }
}
