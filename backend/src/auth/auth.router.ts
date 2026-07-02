import { Router } from 'express';
import type { AuthController } from './auth.controller.js';

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
   *             type: object
   *             properties:
   *               fullName:
   *                 type: string
   *                 example: John Doe
   *               birthdate:
   *                 type: string
   *                 example: 1990-01-01
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *             required:
   *               - fullName
   *               - birthdate
   *               - email
   *               - password
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
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *             required:
   *               - email
   *               - password
   *     responses:
   *       200:
   *         description: Login successful
   *       400:
   *         description: Validation Error
   *       401:
   *         description: Unauthorized
   */
  router.post('/login', controller.login);

  return router;
}