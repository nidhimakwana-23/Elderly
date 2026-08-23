import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { FamilyService, ValidationError, ConflictError } from './family.service.js';

export class FamilyController {
  constructor(private readonly familyService: FamilyService) { }

  createProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const linkedToUserId = req.user?.id;
      if (!linkedToUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const result = await this.familyService.createFamilyProfile(req.body, linkedToUserId);
      res.status(201).json({
        message: 'Family profile created successfully.',
        profile: result.profile,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        logger.error('[FamilyController.createProfile] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };

  getProfiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const linkedToUserId = req.user?.id;
      if (!linkedToUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const profiles = await this.familyService.getFamilyProfiles(linkedToUserId);
      res.status(200).json({ profiles });
    } catch (error) {
      logger.error('[FamilyController.getProfiles] Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
}
