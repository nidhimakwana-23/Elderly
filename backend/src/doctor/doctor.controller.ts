import type { Request, Response } from 'express';
import { DoctorService, NotFoundError, ConflictError } from './doctor.service.js';
import { CreateDoctorProfileDtoSchema, UpdateAvailabilityDtoSchema, UpdateDoctorProfileDtoSchema } from './doctor.types.js';

export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {
    this.createProfile     = this.createProfile.bind(this);
    this.getMyProfile      = this.getMyProfile.bind(this);
    this.getProfileById    = this.getProfileById.bind(this);
    this.searchNearby      = this.searchNearby.bind(this);
    this.updateProfile     = this.updateProfile.bind(this);
    this.updateAvailability = this.updateAvailability.bind(this);
  }

  /** POST /api/doctors/profile — Doctor creates their profile. */
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const dto = CreateDoctorProfileDtoSchema.parse(req.body);
      const profile = await this.doctorService.createProfile(userId, dto);
      res.status(201).json(profile);
    } catch (error: any) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.errors ?? error.message });
      }
    }
  }

  /** GET /api/doctors/me — Doctor fetches their own profile. */
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found. Please create one first.' });
        return;
      }
      res.json(profile);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** GET /api/doctors/:id — Get a public doctor profile. */
  async getProfileById(req: Request, res: Response): Promise<void> {
    try {
      const profile = await this.doctorService.getProfileById(req.params['id'] as string);
      if (!profile) {
        res.status(404).json({ error: 'Doctor not found.' });
        return;
      }
      res.json(profile);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /**
   * GET /api/doctors/nearby?lat=&lng=&radius=&specialization=
   * Patient searches for nearby doctors.
   */
  async searchNearby(req: Request, res: Response): Promise<void> {
    try {
      const lat  = parseFloat(req.query['lat'] as string);
      const lng  = parseFloat(req.query['lng'] as string);
      const radius = req.query['radius'] ? parseInt(req.query['radius'] as string, 10) : 10_000;
      const specialization = req.query['specialization'] as string | undefined;

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'lat and lng query parameters are required and must be numbers.' });
        return;
      }

      const doctors = await this.doctorService.searchNearby(lng, lat, radius, specialization);
      res.json(doctors);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/doctors/profile — Doctor updates their own profile fields. */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const dto = UpdateDoctorProfileDtoSchema.parse(req.body);
      const updated = await this.doctorService.updateProfile(profile.id, dto);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.errors ?? error.message });
    }
  }

  /** PATCH /api/doctors/availability — Doctor updates their availability slots. */
  async updateAvailability(req: Request, res: Response): Promise<void> {
    try {
      const profile = await this.doctorService.getProfileByUserId(req.user!.id);
      if (!profile) {
        res.status(404).json({ error: 'Doctor profile not found. Create one first.' });
        return;
      }
      const dto = UpdateAvailabilityDtoSchema.parse(req.body);
      const updated = await this.doctorService.updateAvailability(profile.id, dto);
      res.json(updated);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.errors ?? error.message });
      }
    }
  }
}
