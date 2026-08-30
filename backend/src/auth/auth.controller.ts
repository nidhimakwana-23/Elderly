import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import {
  AuthService,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) { }

  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.signup(req.body);
      res.status(201).json({
        message: 'User registered successfully.',
        token: result.token,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        logger.error('[AuthController.signup] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json({
        message: 'Login successful.',
        token: result.token,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof UnauthorizedError) {
        res.status(401).json({ error: error.message });
      } else {
        logger.error('[AuthController.login] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };

  doctorSignup = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.doctorSignup(req.body);
      res.status(201).json({
        message: 'Doctor registered successfully.',
        token: result.token,
        userId: result.userId,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        logger.error('[AuthController.doctorSignup] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };
}
