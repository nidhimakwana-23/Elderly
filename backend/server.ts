import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { MedicineSchema, CreateMedicineDtoSchema, UpdateMedicineDtoSchema } from './src/medicine/medicine.types.js';
import { FamilyProfileSchema, CreateFamilyProfileInputSchema } from './src/family/family.types.js';
import { UserSchema, SignupInputSchema, LoginInputSchema, JwtPayloadSchema } from './src/auth/auth.types.js';
import { HealthCheckSchema, CreateHealthCheckDtoSchema, UpdateHealthCheckDtoSchema } from './src/health-check/health-check.types.js';

// ─── DB Connection ────────────────────────────────────────────────────────────
import { connectDB } from './src/db/mongoose/connection.js';

// ─── Mongoose Repositories ────────────────────────────────────────────────────
import { MongooseUserRepository } from './src/db/mongoose/mongoose.user.repository.js';
import { MongooseMedicineRepository } from './src/db/mongoose/mongoose.medicine.repository.js';
import { MongooseMedicineLogsRepository } from './src/db/mongoose/mongoose.medicine-logs.repository.js';
import { MongooseHealthCheckRepository } from './src/db/mongoose/mongoose.health-check.repository.js';

// ─── Services ─────────────────────────────────────────────────────────────────
import { AuthService } from './src/auth/auth.service.js';
import { FamilyService } from './src/family/family.service.js';
import { MedicineService } from './src/medicine/medicine.service.js';
import { MedicineLogsService } from './src/medicine-logs/medicine-logs.service.js';
import { HealthCheckService } from './src/health-check/health-check.service.js';

// ─── Controllers ──────────────────────────────────────────────────────────────
import { AuthController } from './src/auth/auth.controller.js';
import { FamilyController } from './src/family/family.controller.js';
import { MedicineController } from './src/medicine/medicine.controller.js';
import { MedicineLogsController } from './src/medicine-logs/medicine-logs.controller.js';
import { HealthCheckController } from './src/health-check/health-check.controller.js';

// ─── Routers ──────────────────────────────────────────────────────────────────
import { createAuthRouter } from './src/auth/auth.router.js';
import { createFamilyRouter } from './src/family/family.router.js';
import { createMedicineRouter } from './src/medicine/medicine.router.js';
import { createMedicineLogsRouter, createMedicineReportRouter } from './src/medicine-logs/medicine-logs.router.js';
import { createHealthCheckRouter } from './src/health-check/health-check.router.js';

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
const healthCheckRepository   = new MongooseHealthCheckRepository();

const authService             = new AuthService(userRepository);
const familyService           = new FamilyService(userRepository);
const medicineService         = new MedicineService(medicineRepository);
const medicineLogsService     = new MedicineLogsService(medicineLogsRepository);
const healthCheckService      = new HealthCheckService(healthCheckRepository);

const authController          = new AuthController(authService);
const familyController        = new FamilyController(familyService);
const medicineController      = new MedicineController(medicineService);
const medicineLogsController  = new MedicineLogsController(medicineLogsService);
const healthCheckController   = new HealthCheckController(healthCheckService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth',            createAuthRouter(authController));
app.use('/api/family',          createFamilyRouter(familyController));
app.use('/api/medicines',       createMedicineRouter(medicineController));
app.use('/api/medicine-logs',   createMedicineLogsRouter(medicineLogsController));
app.use('/api/medicine-report', createMedicineReportRouter(medicineLogsController));
app.use('/api/health-checks',   createHealthCheckRouter(healthCheckController));

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
      schemas: {
        Medicine: z.toJSONSchema(MedicineSchema, { target: 'openapi-3.0' }),
        CreateMedicineDto: z.toJSONSchema(CreateMedicineDtoSchema, { target: 'openapi-3.0' }),
        UpdateMedicineDto: z.toJSONSchema(UpdateMedicineDtoSchema, { target: 'openapi-3.0' }),
        FamilyProfile: z.toJSONSchema(FamilyProfileSchema, { target: 'openapi-3.0' }),
        CreateFamilyProfileInput: z.toJSONSchema(CreateFamilyProfileInputSchema, { target: 'openapi-3.0' }),
        User: z.toJSONSchema(UserSchema, { target: 'openapi-3.0' }),
        SignupInput: z.toJSONSchema(SignupInputSchema, { target: 'openapi-3.0' }),
        LoginInput: z.toJSONSchema(LoginInputSchema, { target: 'openapi-3.0' }),
        JwtPayload: z.toJSONSchema(JwtPayloadSchema, { target: 'openapi-3.0' }),
        HealthCheck: z.toJSONSchema(HealthCheckSchema, { target: 'openapi-3.0' }),
        CreateHealthCheckDto: z.toJSONSchema(CreateHealthCheckDtoSchema, { target: 'openapi-3.0' }),
        UpdateHealthCheckDto: z.toJSONSchema(UpdateHealthCheckDtoSchema, { target: 'openapi-3.0' }),
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
