import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { MemoryUserRepository } from './src/db/memory/memory.user.repository.js';
import { AuthService } from './src/auth/auth.service.js';
import { AuthController } from './src/auth/auth.controller.js';
import { createAuthRouter } from './src/auth/auth.router.js';

const app = express();
const port = process.env['PORT'] ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json()); // Parse incoming JSON request bodies

// ─── Dependency wiring ────────────────────────────────────────────────────────
// This is the ONE place where concrete implementations are chosen.
// To swap the storage layer, only change the first line below.
const userRepository = new MemoryUserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth', createAuthRouter(authController));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
