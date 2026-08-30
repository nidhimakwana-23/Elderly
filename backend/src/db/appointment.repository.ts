import type { Appointment } from '../appointment/appointment.types';

export interface IAppointmentRepository {
  create(appointment: Appointment): Promise<Appointment>;
  findById(id: string): Promise<Appointment | undefined>;
  findByPatientId(patient_id: string): Promise<Appointment[]>;
  findByDoctorProfileId(doctor_profile_id: string): Promise<Appointment[]>;
  updateStatus(id: string, status: string): Promise<Appointment | undefined>;
  /** Permanently removes the document. Prefer softDelete for recoverable deletes. */
  delete(id: string): Promise<boolean>;
  /** Sets deleted_at to the current timestamp; the document remains in the DB. */
  softDelete(id: string): Promise<boolean>;
}
