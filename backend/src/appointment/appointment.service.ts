import { randomUUID } from 'node:crypto';
import type { IAppointmentRepository } from '../db/appointment.repository';
import type { IDoctorRepository } from '../db/doctor.repository';
import type {
  Appointment,
  CreateAppointmentDto,
} from './appointment.types';

export class NotFoundError extends Error {
  constructor(message = 'Resource not found.') { super(message); this.name = 'NotFoundError'; }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden.') { super(message); this.name = 'ForbiddenError'; }
}

export class ValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

export class AppointmentService {
  constructor(
    private readonly repo: IAppointmentRepository,
    private readonly doctorRepo: IDoctorRepository,
  ) {}

  /**
   * Patient books an appointment.
   * Validates that the requested slot exists and is not already booked,
   * then marks the slot as booked on the DoctorProfile.
   */
  async bookAppointment(patientId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const doctorProfile = await this.doctorRepo.findById(dto.doctor_profile_id);
    if (!doctorProfile) throw new NotFoundError('Doctor profile not found.');

    const slot = doctorProfile.availability.find((s) => s.id === dto.slot_id);
    if (!slot) throw new NotFoundError('Slot not found on this doctor\'s profile.');
    if (slot.is_booked) throw new ValidationError('This slot is already booked.');

    // Mark slot as booked
    const updatedSlots = doctorProfile.availability.map((s) =>
      s.id === dto.slot_id ? { ...s, is_booked: true } : s
    );
    await this.doctorRepo.updateAvailability(doctorProfile.id, { availability: updatedSlots });

    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...dto,
      id: randomUUID(),
      patient_id: patientId,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    return this.repo.create(appointment);
  }

  async getAppointmentsForPatient(patientId: string): Promise<Appointment[]> {
    return this.repo.findByPatientId(patientId);
  }

  async getAppointmentsForDoctor(doctorProfileId: string): Promise<Appointment[]> {
    return this.repo.findByDoctorProfileId(doctorProfileId);
  }

  /**
   * Doctor updates appointment status.
   * Only the doctor who owns the appointment (matches doctor_profile_id) can update.
   */
  async updateStatus(
    appointmentId: string,
    newStatus: 'confirmed' | 'cancelled' | 'completed',
    doctorProfile: { id: string },
  ): Promise<Appointment> {
    const appointment = await this.repo.findById(appointmentId);
    if (!appointment) throw new NotFoundError('Appointment not found.');
    if (appointment.doctor_profile_id !== doctorProfile.id) {
      throw new ForbiddenError('You can only update your own appointments.');
    }
    const updated = await this.repo.updateStatus(appointmentId, newStatus);
    return updated!;
  }

  /** Patient or doctor cancels an appointment. */
  async cancelAppointment(appointmentId: string, requesterId: string, requesterRole: string): Promise<void> {
    const appointment = await this.repo.findById(appointmentId);
    if (!appointment) throw new NotFoundError('Appointment not found.');

    const isPatient = appointment.patient_id === requesterId;
    const isDoctor  = requesterRole === 'doctor'; // doctor can cancel any of their appointments
    if (!isPatient && !isDoctor) {
      throw new ForbiddenError('You are not allowed to cancel this appointment.');
    }

    await this.repo.updateStatus(appointmentId, 'cancelled');

    // Free the slot back on the doctor profile
    const doctorProfile = await this.doctorRepo.findById(appointment.doctor_profile_id);
    if (doctorProfile) {
      const updatedSlots = doctorProfile.availability.map((s) =>
        s.id === appointment.slot_id ? { ...s, is_booked: false } : s
      );
      await this.doctorRepo.updateAvailability(doctorProfile.id, { availability: updatedSlots });
    }
  }
}
