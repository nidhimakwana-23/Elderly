import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role?: string;
    };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header.' });
    return;
  }

  const token = authHeader.split(' ')[1] as string;
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET is not configured.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret as string) as unknown as { sub: string; email: string; role?: string };
    req.user = { id: payload.sub, email: payload.email };
    if (payload.role) req.user.role = payload.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole — middleware factory that checks the authenticated user's role.
 * Must be used AFTER requireAuth.
 *
 * @example router.get('/admin', requireAuth, requireRole('doctor'), handler)
 */
export function requireRole(...roles: string[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}.` });
      return;
    }
    next();
  };
}
