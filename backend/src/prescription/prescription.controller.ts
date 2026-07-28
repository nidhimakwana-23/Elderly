import type { Request, Response } from 'express';
import {
  PrescriptionService,
  NotFoundError,
  ForbiddenError,
} from './prescription.service.js';
import {
  CreatePrescriptionDtoSchema,
  UpdatePrescriptionDtoSchema,
} from './prescription.types.js';

export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {
    this.create             = this.create.bind(this);
    this.getById            = this.getById.bind(this);
    this.getForPatient      = this.getForPatient.bind(this);
    this.update             = this.update.bind(this);
    this.deletePrescription = this.deletePrescription.bind(this);
  }

  /** POST /api/prescriptions — Doctor creates prescription. */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto          = CreatePrescriptionDtoSchema.parse(req.body);
      const prescription = await this.prescriptionService.createPrescription(req.user!.id, dto);
      res.status(201).json(prescription);
    } catch (error: any) {
      res.status(400).json({ error: error.errors ?? error.message });
    }
  }

  /** GET /api/prescriptions/:id — Get single prescription. */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const prescription = await this.prescriptionService.getPrescriptionById(req.params['id'] as string);
      if (!prescription) {
        res.status(404).json({ error: 'Prescription not found.' });
        return;
      }
      res.json(prescription);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** GET /api/prescriptions/patient/:patientId — All prescriptions for a patient. */
  async getForPatient(req: Request, res: Response): Promise<void> {
    try {
      const prescriptions = await this.prescriptionService.getPrescriptionsForPatient(
        req.params['patientId'] as string,
      );
      res.json(prescriptions);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  /** PATCH /api/prescriptions/:id — Doctor edits their own prescription. */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const dto     = UpdatePrescriptionDtoSchema.parse(req.body);
      const updated = await this.prescriptionService.updatePrescription(
        req.params['id'] as string,
        dto,
        req.user!.id,
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

  /** DELETE /api/prescriptions/:id — Doctor deletes their own prescription. */
  async deletePrescription(req: Request, res: Response): Promise<void> {
    try {
      await this.prescriptionService.deletePrescription(req.params['id'] as string, req.user!.id);
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
