import type { Request, Response } from 'express';
import type { MedicineService } from './medicine.service.js';

export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  createMedicine = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const target_patient = req.body.patient_id || userId;
      const medicine = await this.medicineService.createMedicine(target_patient, req.body);
      res.status(201).json(medicine);
    } catch (error) {
      console.error('[MedicineController.createMedicine]', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };

  getMedicines = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const target_patient = (req.query.patient_id as string) || userId;
      const medicines = await this.medicineService.getMedicines(target_patient);
      res.status(200).json(medicines);
    } catch (error) {
      console.error('[MedicineController.getMedicines]', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };

  getMedicineById = async (req: Request, res: Response): Promise<void> => {
    try {
      const medicine = await this.medicineService.getMedicineById(req.params.id as string);
      if (!medicine) {
        res.status(404).json({ error: 'Medicine not found' });
        return;
      }
      res.status(200).json(medicine);
    } catch (error) {
      console.error('[MedicineController.getMedicineById]', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };

  updateMedicine = async (req: Request, res: Response): Promise<void> => {
    try {
      const medicine = await this.medicineService.updateMedicine(req.params.id as string, req.body);
      if (!medicine) {
        res.status(404).json({ error: 'Medicine not found' });
        return;
      }
      res.status(200).json(medicine);
    } catch (error) {
      console.error('[MedicineController.updateMedicine]', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };

  deleteMedicine = async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await this.medicineService.deleteMedicine(req.params.id as string);
      if (!success) {
        res.status(404).json({ error: 'Medicine not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error('[MedicineController.deleteMedicine]', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}
