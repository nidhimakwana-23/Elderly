import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  export interface Request {
    user?: {
      id: string;
      email: string;
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
    const payload = jwt.verify(token, secret as string) as unknown as { sub: string; email: string };
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
