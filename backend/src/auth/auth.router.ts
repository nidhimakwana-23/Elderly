import { Router } from 'express';
import type { AuthController } from './auth.controller';

/**
 * createAuthRouter — factory that receives a ready-made controller and returns
 * a configured Express Router. This keeps the router free of any construction
 * logic, making it easy to test.
 */
export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/auth/signup:
   *   post:
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SignupInput'
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Validation Error
   *       409:
   *         description: Conflict Error
   */
  router.post('/signup', controller.signup);

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     summary: Login a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginInput'
   *     responses:
   *       200:
   *         description: Login successful
   *       400:
   *         description: Validation Error
   *       401:
   *         description: Unauthorized
   */
  router.post('/login', controller.login);

  /**
   * @openapi
   * /api/auth/doctor/signup:
   *   post:
   *     summary: Register a new doctor account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DoctorSignupInput'
   *     responses:
   *       201:
   *         description: Doctor registered successfully
   *       400:
   *         description: Validation Error
   *       409:
   *         description: Conflict Error
   */
  router.post('/doctor/signup', controller.doctorSignup);

  return router;
}