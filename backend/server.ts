import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import swaggerJsdoc from 'swagger-jsdoc';

// ─── DB Connection ────────────────────────────────────────────────────────────
import { connectDB } from './src/db/mongoose/connection.js';

// ─── Mongoose Repositories ────────────────────────────────────────────────────
import { MongooseUserRepository } from './src/db/mongoose/mongoose.user.repository.js';
import { MongooseMedicineRepository } from './src/db/mongoose/mongoose.medicine.repository.js';
import { MongooseMedicineLogsRepository } from './src/db/mongoose/mongoose.medicine-logs.repository.js';

// ─── Services ─────────────────────────────────────────────────────────────────
import { AuthService } from './src/auth/auth.service.js';
import { FamilyService } from './src/family/family.service.js';
import { MedicineService } from './src/medicine/medicine.service.js';
import { MedicineLogsService } from './src/medicine-logs/medicine-logs.service.js';

// ─── Controllers ──────────────────────────────────────────────────────────────
import { AuthController } from './src/auth/auth.controller.js';
import { FamilyController } from './src/family/family.controller.js';
import { MedicineController } from './src/medicine/medicine.controller.js';
import { MedicineLogsController } from './src/medicine-logs/medicine-logs.controller.js';

// ─── Routers ──────────────────────────────────────────────────────────────────
import { createAuthRouter } from './src/auth/auth.router.js';
import { createFamilyRouter } from './src/family/family.router.js';
import { createMedicineRouter } from './src/medicine/medicine.router.js';
import { createMedicineLogsRouter, createMedicineReportRouter } from './src/medicine-logs/medicine-logs.router.js';

const app = express();
const port = process.env['PORT'] ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Dependency wiring ────────────────────────────────────────────────────────
// This is the ONE place where concrete implementations are chosen.
// To swap the storage layer, only change the repository instantiations below.
const userRepository          = new MongooseUserRepository();
const medicineRepository      = new MongooseMedicineRepository();
const medicineLogsRepository  = new MongooseMedicineLogsRepository();

const authService             = new AuthService(userRepository);
const familyService           = new FamilyService(userRepository);
const medicineService         = new MedicineService(medicineRepository);
const medicineLogsService     = new MedicineLogsService(medicineLogsRepository);

const authController          = new AuthController(authService);
const familyController        = new FamilyController(familyService);
const medicineController      = new MedicineController(medicineService);
const medicineLogsController  = new MedicineLogsController(medicineLogsService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth',            createAuthRouter(authController));
app.use('/api/family',          createFamilyRouter(familyController));
app.use('/api/medicines',       createMedicineRouter(medicineController));
app.use('/api/medicine-logs',   createMedicineLogsRouter(medicineLogsController));
app.use('/api/medicine-report', createMedicineReportRouter(medicineLogsController));

// ─── OpenAPI / Scalar ─────────────────────────────────────────────────────────
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
// Connect to MongoDB first, then start accepting HTTP requests.
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error('❌  Failed to connect to MongoDB:', err);
    process.exit(1);
  });
