import type { Request, Response } from 'express';
import {
  AppointmentService,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from './appointment.service';
import {
  CreateAppointmentDtoSchema,
  UpdateAppointmentStatusDtoSchema,
} from './appointment.types';
import { DoctorService } from '../doctor/doctor.service';

export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly doctorService: DoctorService,
  ) {
    this.book         = this.book.bind(this);
    this.getMyAppointments = this.getMyAppointments.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.cancel       = this.cancel.bind(this);
  }

  /** POST /api/appointments — Patient books an appointment. */
  async book(req: Request, res: Response): Promise<void> {
    try {
      const dto         = CreateAppointmentDtoSchema.parse(req.body);
      const appointment = await this.appointmentService.bookAppointment(req.user!.id, dto);
      res.status(201).json(appointment);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.errors ?? error.message });
      }
    }
  }

  /**
   * GET /api/appointments/me — Returns appointments for the caller.
   * Patients get their own; doctors get appointments for their profile.
   */
  async getMyAppointments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const role   = req.user!.role;

      if (role === 'doctor') {
        const profile = await this.doctorService.getProfileByUserId(userId);
        if (!profile) {
          res.status(404).json({ error: 'Doctor profile not found.' });
          return;
        }
        const appointments = await this.appointmentService.getAppointmentsForDoctor(profile.id);
        res.json(appointments);
      } else {
        const appointments = await this.appointmentService.getAppointmentsForPatient(userId);
        res.json(appointments);
      }
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/appointments/:id/status — Doctor confirms/completes an appointment. */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const doctorProfile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!doctorProfile) {
        res.status(404).json({ error: 'Doctor profile not found.' });
        return;
      }
      const { status } = UpdateAppointmentStatusDtoSchema.parse(req.body);
      const updated = await this.appointmentService.updateStatus(
        req.params['id'] as string,
        status,
        doctorProfile,
      );
      res.json(updated);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.errors ?? error.message });
      }
    }
  }

  /** DELETE /api/appointments/:id — Patient or doctor cancels an appointment. */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      await this.appointmentService.cancelAppointment(
        req.params['id'] as string,
        req.user!.id,
        req.user!.role ?? 'normal',
      );
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  }
}
