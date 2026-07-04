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
import { medicineRouter } from './src/medicine/medicine.router.js';
import { MemoryMedicineLogsRepository } from './src/db/memory/memory.medicine-logs.repository.js';
import { MedicineLogsService } from './src/medicine-logs/medicine-logs.service.js';
import { MedicineLogsController } from './src/medicine-logs/medicine-logs.controller.js';
import { createMedicineLogsRouter, createMedicineReportRouter } from './src/medicine-logs/medicine-logs.router.js';
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
const medicineLogsRepository = new MemoryMedicineLogsRepository();
const medicineLogsService = new MedicineLogsService(medicineLogsRepository);
const medicineLogsController = new MedicineLogsController(medicineLogsService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth', createAuthRouter(authController));
app.use('/api/family', createFamilyRouter(familyController));
app.use('/api/medicines', medicineRouter);
app.use('/api/medicine-logs', createMedicineLogsRouter(medicineLogsController));
app.use('/api/medicine-report', createMedicineReportRouter(medicineLogsController));

import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elderly API',
      version: '1.0.0',
      description: 'API documentation for the Elderly project',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/**/*.ts'],
};

const openapiSpec = swaggerJsdoc(swaggerOptions);

app.get('/openapi.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpec);
});
app.use(
  '/reference',
  apiReference({
    theme: 'purple',
    spec: {
      content: openapiSpec,
    },
  })
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
