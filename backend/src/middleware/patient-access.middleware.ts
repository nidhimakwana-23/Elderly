import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { IUserRepository } from '../db/user.repository.js';

export function requirePatientAccess(userRepository: IUserRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const callerId = req.user?.id;
      if (!callerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const targetId =
        (req.query['patient_id'] as string) ||
        (req.body && req.body['patient_id']) ||
        req.params['elderlyId'];

      // If targetId is not specified or equals callerId, access is allowed (accessing own data)
      if (!targetId || targetId === callerId) {
        next();
        return;
      }

      // Check if targetId is linked to callerId via FamilyProfile
      const profiles = await userRepository.getFamilyProfilesByUserId(callerId);
      const isLinked = profiles.some((p) => p.userId === targetId);

      if (!isLinked) {
        res.status(403).json({ error: 'Access denied: You are not authorized to access data for this patient.' });
        return;
      }

      next();
    } catch (error) {
      logger.error('[requirePatientAccess] Error checking patient access:', error);
      res.status(500).json({ error: 'Internal server error during authorization check.' });
    }
  };
}
