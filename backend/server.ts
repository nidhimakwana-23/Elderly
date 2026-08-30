import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { MedicineSchema, CreateMedicineDtoSchema, UpdateMedicineDtoSchema } from './src/medicine/medicine.types';
import { FamilyProfileSchema, CreateFamilyProfileInputSchema } from './src/family/family.types';
import { UserSchema, SignupInputSchema, LoginInputSchema, JwtPayloadSchema, DoctorSignupInputSchema } from './src/auth/auth.types';
import { HealthCheckSchema, CreateHealthCheckDtoSchema, UpdateHealthCheckDtoSchema } from './src/health-check/health-check.types';
import { DoctorProfileSchema, CreateDoctorProfileDtoSchema } from './src/doctor/doctor.types';
import { AppointmentSchema, CreateAppointmentDtoSchema } from './src/appointment/appointment.types';
import { EmergencyRequestSchema, CreateEmergencyDtoSchema } from './src/emergency/emergency.types';
import { PrescriptionSchema, CreatePrescriptionDtoSchema } from './src/prescription/prescription.types';

// ─── DB Connection ────────────────────────────────────────────────────────────
import { connectDB } from './src/db/mongoose/connection';

// ─── Mongoose Repositories ────────────────────────────────────────────────────────────
import { MongooseUserRepository } from './src/db/mongoose/mongoose.user.repository';
import { MongooseMedicineRepository } from './src/db/mongoose/mongoose.medicine.repository';
import { MongooseMedicineLogsRepository } from './src/db/mongoose/mongoose.medicine-logs.repository';
import { MongooseHealthCheckRepository } from './src/db/mongoose/mongoose.health-check.repository';
import { MongooseDoctorRepository } from './src/db/mongoose/mongoose.doctor.repository';
import { MongooseAppointmentRepository } from './src/db/mongoose/mongoose.appointment.repository';
import { MongooseEmergencyRepository } from './src/db/mongoose/mongoose.emergency.repository';
import { MongoosePrescriptionRepository } from './src/db/mongoose/mongoose.prescription.repository';

// ─── Services ──────────────────────────────────────────────────────────────────────────
import { AuthService } from './src/auth/auth.service';
import { FamilyService } from './src/family/family.service';
import { MedicineService } from './src/medicine/medicine.service';
import { MedicineLogsService } from './src/medicine-logs/medicine-logs.service';
import { HealthCheckService } from './src/health-check/health-check.service';
import { DoctorService } from './src/doctor/doctor.service';
import { AppointmentService } from './src/appointment/appointment.service';
import { EmergencyService } from './src/emergency/emergency.service';
import { PrescriptionService } from './src/prescription/prescription.service';
import { HealthTrendService } from './src/health-trend/health-trend.service';

// ─── Controllers ──────────────────────────────────────────────────────────────────────────
import { AuthController } from './src/auth/auth.controller';
import { FamilyController } from './src/family/family.controller';
import { MedicineController } from './src/medicine/medicine.controller';
import { MedicineLogsController } from './src/medicine-logs/medicine-logs.controller';
import { HealthCheckController } from './src/health-check/health-check.controller';
import { DoctorController } from './src/doctor/doctor.controller';
import { AppointmentController } from './src/appointment/appointment.controller';
import { EmergencyController } from './src/emergency/emergency.controller';
import { PrescriptionController } from './src/prescription/prescription.controller';
import { HealthTrendController } from './src/health-trend/health-trend.controller';

// ─── Routers ──────────────────────────────────────────────────────────────────────────
import { createAuthRouter } from './src/auth/auth.router';
import { createFamilyRouter } from './src/family/family.router';
import { createMedicineRouter } from './src/medicine/medicine.router';
import { createMedicineLogsRouter, createMedicineReportRouter } from './src/medicine-logs/medicine-logs.router';
import { createHealthCheckRouter } from './src/health-check/health-check.router';
import { createDoctorRouter } from './src/doctor/doctor.router';
import { createAppointmentRouter } from './src/appointment/appointment.router';
import { createEmergencyRouter } from './src/emergency/emergency.router';
import { createPrescriptionRouter } from './src/prescription/prescription.router';
import { createHealthTrendRouter } from './src/health-trend/health-trend.router';
import { AiService } from './src/ai/ai.service';
import { AiController } from './src/ai/ai.controller';
import { createAiRouter } from './src/ai/ai.router';
import { logger } from './src/utils/logger';

const app = express();
const port = process.env['PORT'] ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ─── Request / Response Logger ───────────────────────────────────────────────
// Logs: timestamp · method · path · status · latency
// Colors: green for 2xx, yellow for 3xx/4xx, red for 5xx
app.use((req: Request, res: Response, next: NextFunction): void => {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    logger.http(req.method, req.originalUrl, res.statusCode, durationMs);
  });

  next();
});

// ─── Dependency wiring ────────────────────────────────────────────────────────
// This is the ONE place where concrete implementations are chosen.
// To swap the storage layer, only change the repository instantiations below.
const userRepository = new MongooseUserRepository();
const medicineRepository = new MongooseMedicineRepository();
const medicineLogsRepository = new MongooseMedicineLogsRepository();
const healthCheckRepository = new MongooseHealthCheckRepository();
const doctorRepository = new MongooseDoctorRepository();
const appointmentRepository = new MongooseAppointmentRepository();
const emergencyRepository = new MongooseEmergencyRepository();
const prescriptionRepository = new MongoosePrescriptionRepository();

const authService = new AuthService(userRepository);
const familyService = new FamilyService(userRepository);
const medicineService = new MedicineService(medicineRepository);
const medicineLogsService = new MedicineLogsService(medicineLogsRepository);
const healthCheckService = new HealthCheckService(healthCheckRepository);
const doctorService = new DoctorService(doctorRepository);
const appointmentService = new AppointmentService(appointmentRepository, doctorRepository);
const emergencyService = new EmergencyService(emergencyRepository);
const prescriptionService = new PrescriptionService(prescriptionRepository);
const healthTrendService = new HealthTrendService(
  healthCheckRepository,
  medicineLogsRepository,
  medicineRepository,
  prescriptionRepository,
  appointmentRepository,
);
const aiService = new AiService(healthCheckService, medicineLogsService, medicineService);

const authController = new AuthController(authService);
const familyController = new FamilyController(familyService);
const medicineController = new MedicineController(medicineService);
const medicineLogsController = new MedicineLogsController(medicineLogsService);
const healthCheckController = new HealthCheckController(healthCheckService);
const doctorController = new DoctorController(doctorService);
const appointmentController = new AppointmentController(appointmentService, doctorService);
const emergencyController = new EmergencyController(emergencyService, doctorService);
const prescriptionController = new PrescriptionController(prescriptionService);
const healthTrendController = new HealthTrendController(healthTrendService);
const aiController = new AiController(aiService);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.use('/api/auth', createAuthRouter(authController));
app.use('/api/family', createFamilyRouter(familyController));
app.use('/api/medicines', createMedicineRouter(medicineController, userRepository));
app.use('/api/medicine-logs', createMedicineLogsRouter(medicineLogsController, userRepository));
app.use('/api/medicine-report', createMedicineReportRouter(medicineLogsController, userRepository));
app.use('/api/health-checks', createHealthCheckRouter(healthCheckController, userRepository));
app.use('/api/doctors', createDoctorRouter(doctorController));
app.use('/api/appointments', createAppointmentRouter(appointmentController));
app.use('/api/emergency', createEmergencyRouter(emergencyController));
app.use('/api/prescriptions', createPrescriptionRouter(prescriptionController));
app.use('/api/health-trend', createHealthTrendRouter(healthTrendController));
app.use('/api/ai', createAiRouter(aiController));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req: Request, res: Response): void => {
  logger.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must have exactly 4 parameters so Express recognises it as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode =
    err instanceof Error && 'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number'
      ? (err as { statusCode: number }).statusCode
      : 500;

  const message = err instanceof Error ? err.message : 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error('[ERROR] Unhandled exception caught by global error handler:', err);
  } else {
    logger.warn(`[WARN] Client error ${statusCode}: ${message}`);
  }

  if (res.headersSent) return;

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
});

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
        DoctorProfile: z.toJSONSchema(DoctorProfileSchema, { target: 'openapi-3.0' }),
        CreateDoctorProfileDto: z.toJSONSchema(CreateDoctorProfileDtoSchema, { target: 'openapi-3.0' }),
        Appointment: z.toJSONSchema(AppointmentSchema, { target: 'openapi-3.0' }),
        CreateAppointmentDto: z.toJSONSchema(CreateAppointmentDtoSchema, { target: 'openapi-3.0' }),
        EmergencyRequest: z.toJSONSchema(EmergencyRequestSchema, { target: 'openapi-3.0' }),
        CreateEmergencyDto: z.toJSONSchema(CreateEmergencyDtoSchema, { target: 'openapi-3.0' }),
        Prescription: z.toJSONSchema(PrescriptionSchema, { target: 'openapi-3.0' }),
        CreatePrescriptionDto: z.toJSONSchema(CreatePrescriptionDtoSchema, { target: 'openapi-3.0' }),
        DoctorSignupInput: z.toJSONSchema(DoctorSignupInputSchema, { target: 'openapi-3.0' }),
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
      logger.info(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err: unknown) => {
    logger.error('❌  Failed to connect to MongoDB:', err);
    process.exit(1);
  });
