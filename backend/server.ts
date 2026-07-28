import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import { MemoryUserRepository } from './src/db/memory/memory.user.repository.js';
import { AuthService } from './src/auth/auth.service.js';
import { AuthController } from './src/auth/auth.controller.js';
import { createAuthRouter } from './src/auth/auth.router.js';
import { FamilyService } from './src/family/family.service.js';
import { FamilyController } from './src/family/family.controller.js';
import { createFamilyRouter } from './src/family/family.router.js';

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
const familyService = new FamilyService(userRepository);
const familyController = new FamilyController(familyService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth', createAuthRouter(authController));
app.use('/api/family', createFamilyRouter(familyController));

// ─── Docs ─────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf8'));

app.use(
  '/reference',
  apiReference({
    theme: 'purple',
    spec: {
      content: openapiSpec,
    },
  })
);

// pAchi jo aa bi ek route che ^ /reference  -- aa route ma pelu UI btave, ek vaar check kari jojow ow how  

// Areee hu nato brwoser ma me type karyu hatu localhost:3001/reference, evu aree ane copy kar, aa route check kar em brwoser ma 
// avu ny? maru jo baaju maj tab che  ema url check kar, ej url ah ej lakhyu chhe bwo  
// JO me kayu url lakhyu hatu ..bsssssssss  haa pachi aakhu try kar, login signup bdhu :) tare agad batavanu bi che to tne to khbr hovi joie ne :)
// Ruk jo akhu ek var kari ne batavu chu, aa time dhyan aapje :)

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
