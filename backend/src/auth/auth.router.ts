import { Router } from 'express';
import type { AuthController } from './auth.controller.js';

/**
 * createAuthRouter — factory that receives a ready-made controller and returns
 * a configured Express Router. This keeps the router free of any construction
 * logic, making it easy to test.
 */
export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  // POST /api/auth/signup
  router.post('/signup', controller.signup);

  // POST /api/auth/login
  router.post('/login', controller.login);

  return router;
}
