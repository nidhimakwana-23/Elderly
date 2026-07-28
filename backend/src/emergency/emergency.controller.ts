import type { Request, Response } from 'express';
import {
  EmergencyService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from './emergency.service.js';
import { CreateEmergencyDtoSchema } from './emergency.types.js';
import { DoctorService } from '../doctor/doctor.service.js';

export class EmergencyController {
  constructor(
    private readonly emergencyService: EmergencyService,
    private readonly doctorService: DoctorService,
  ) {
    this.raise          = this.raise.bind(this);
    this.getOpenNearby  = this.getOpenNearby.bind(this);
    this.accept         = this.accept.bind(this);
    this.resolve        = this.resolve.bind(this);
    this.cancel         = this.cancel.bind(this);
    this.getMyEmergencies = this.getMyEmergencies.bind(this);
  }

  /** POST /api/emergency — Patient raises an SOS. */
  async raise(req: Request, res: Response): Promise<void> {
    try {
      const dto     = CreateEmergencyDtoSchema.parse(req.body);
      const request = await this.emergencyService.raiseEmergency(req.user!.id, dto);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ error: error.errors ?? error.message });
    }
  }

  /** GET /api/emergency/open?lat=&lng=&radius= — Doctor sees nearby open emergencies. */
  async getOpenNearby(req: Request, res: Response): Promise<void> {
    try {
      const lat    = parseFloat(req.query['lat'] as string);
      const lng    = parseFloat(req.query['lng'] as string);
      const radius = req.query['radius'] ? parseInt(req.query['radius'] as string, 10) : 10_000;

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'lat and lng query parameters are required.' });
        return;
      }
      const requests = await this.emergencyService.getOpenNearby(lng, lat, radius);
      res.json(requests);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** GET /api/emergency/mine — Patient sees their own emergency history. */
  async getMyEmergencies(req: Request, res: Response): Promise<void> {
    try {
      const requests = await this.emergencyService.getPatientEmergencies(req.user!.id);
      res.json(requests);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/emergency/:id/accept — Doctor accepts an emergency. */
  async accept(req: Request, res: Response): Promise<void> {
    try {
      const doctorProfile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!doctorProfile) {
        res.status(404).json({ error: 'Doctor profile not found.' });
        return;
      }
      const updated = await this.emergencyService.acceptEmergency(
        req.params['id'] as string,
        doctorProfile.id,
      );
      res.json(updated);
    } catch (error: any) {
      if (error instanceof NotFoundError) res.status(404).json({ error: error.message });
      else if (error instanceof ConflictError) res.status(409).json({ error: error.message });
      else res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/emergency/:id/resolve — Doctor resolves an emergency. */
  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const doctorProfile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!doctorProfile) {
        res.status(404).json({ error: 'Doctor profile not found.' });
        return;
      }
      const updated = await this.emergencyService.resolveEmergency(
        req.params['id'] as string,
        doctorProfile.id,
      );
      res.json(updated);
    } catch (error: any) {
      if (error instanceof NotFoundError) res.status(404).json({ error: error.message });
      else if (error instanceof ForbiddenError) res.status(403).json({ error: error.message });
      else res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/emergency/:id/cancel — Patient cancels their emergency. */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.emergencyService.cancelEmergency(
        req.params['id'] as string,
        req.user!.id,
      );
      res.json(updated);
    } catch (error: any) {
      if (error instanceof NotFoundError) res.status(404).json({ error: error.message });
      else if (error instanceof ForbiddenError) res.status(403).json({ error: error.message });
      else if (error instanceof ConflictError) res.status(409).json({ error: error.message });
      else res.status(500).json({ error: 'Internal server error.' });
    }
  }
}
