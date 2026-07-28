import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiReference } from '@scalar/express-api-reference';
import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { MedicineSchema, CreateMedicineDtoSchema, UpdateMedicineDtoSchema } from './src/medicine/medicine.types.js';
import { FamilyProfileSchema, CreateFamilyProfileInputSchema } from './src/family/family.types.js';
import { UserSchema, SignupInputSchema, LoginInputSchema, JwtPayloadSchema, DoctorSignupInputSchema } from './src/auth/auth.types.js';
import { HealthCheckSchema, CreateHealthCheckDtoSchema, UpdateHealthCheckDtoSchema } from './src/health-check/health-check.types.js';
import { DoctorProfileSchema, CreateDoctorProfileDtoSchema } from './src/doctor/doctor.types.js';
import { AppointmentSchema, CreateAppointmentDtoSchema } from './src/appointment/appointment.types.js';
import { EmergencyRequestSchema, CreateEmergencyDtoSchema } from './src/emergency/emergency.types.js';
import { PrescriptionSchema, CreatePrescriptionDtoSchema } from './src/prescription/prescription.types.js';

// ─── DB Connection ────────────────────────────────────────────────────────────
import { connectDB } from './src/db/mongoose/connection.js';

// ─── Mongoose Repositories ────────────────────────────────────────────────────────────
import { MongooseUserRepository } from './src/db/mongoose/mongoose.user.repository.js';
import { MongooseMedicineRepository } from './src/db/mongoose/mongoose.medicine.repository.js';
import { MongooseMedicineLogsRepository } from './src/db/mongoose/mongoose.medicine-logs.repository.js';
import { MongooseHealthCheckRepository } from './src/db/mongoose/mongoose.health-check.repository.js';
import { MongooseDoctorRepository } from './src/db/mongoose/mongoose.doctor.repository.js';
import { MongooseAppointmentRepository } from './src/db/mongoose/mongoose.appointment.repository.js';
import { MongooseEmergencyRepository } from './src/db/mongoose/mongoose.emergency.repository.js';
import { MongoosePrescriptionRepository } from './src/db/mongoose/mongoose.prescription.repository.js';

// ─── Services ──────────────────────────────────────────────────────────────────────────
import { AuthService } from './src/auth/auth.service.js';
import { FamilyService } from './src/family/family.service.js';
import { MedicineService } from './src/medicine/medicine.service.js';
import { MedicineLogsService } from './src/medicine-logs/medicine-logs.service.js';
import { HealthCheckService } from './src/health-check/health-check.service.js';
import { DoctorService } from './src/doctor/doctor.service.js';
import { AppointmentService } from './src/appointment/appointment.service.js';
import { EmergencyService } from './src/emergency/emergency.service.js';
import { PrescriptionService } from './src/prescription/prescription.service.js';
import { HealthTrendService } from './src/health-trend/health-trend.service.js';

// ─── Controllers ──────────────────────────────────────────────────────────────────────────
import { AuthController } from './src/auth/auth.controller.js';
import { FamilyController } from './src/family/family.controller.js';
import { MedicineController } from './src/medicine/medicine.controller.js';
import { MedicineLogsController } from './src/medicine-logs/medicine-logs.controller.js';
import { HealthCheckController } from './src/health-check/health-check.controller.js';
import { DoctorController } from './src/doctor/doctor.controller.js';
import { AppointmentController } from './src/appointment/appointment.controller.js';
import { EmergencyController } from './src/emergency/emergency.controller.js';
import { PrescriptionController } from './src/prescription/prescription.controller.js';
import { HealthTrendController } from './src/health-trend/health-trend.controller.js';

// ─── Routers ──────────────────────────────────────────────────────────────────────────
import { createAuthRouter } from './src/auth/auth.router.js';
import { createFamilyRouter } from './src/family/family.router.js';
import { createMedicineRouter } from './src/medicine/medicine.router.js';
import { createMedicineLogsRouter, createMedicineReportRouter } from './src/medicine-logs/medicine-logs.router.js';
import { createHealthCheckRouter } from './src/health-check/health-check.router.js';
import { createDoctorRouter } from './src/doctor/doctor.router.js';
import { createAppointmentRouter } from './src/appointment/appointment.router.js';
import { createEmergencyRouter } from './src/emergency/emergency.router.js';
import { createPrescriptionRouter } from './src/prescription/prescription.router.js';
import { createHealthTrendRouter } from './src/health-trend/health-trend.router.js';
import { AiService } from './src/ai/ai.service.js';
import { AiController } from './src/ai/ai.controller.js';
import { createAiRouter } from './src/ai/ai.router.js';

const app = express();
const port = process.env['PORT'] ?? 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ─── Dependency wiring ────────────────────────────────────────────────────────
// This is the ONE place where concrete implementations are chosen.
// To swap the storage layer, only change the repository instantiations below.
const userRepository          = new MongooseUserRepository();
const medicineRepository      = new MongooseMedicineRepository();
const medicineLogsRepository  = new MongooseMedicineLogsRepository();
const healthCheckRepository   = new MongooseHealthCheckRepository();
const doctorRepository        = new MongooseDoctorRepository();
const appointmentRepository   = new MongooseAppointmentRepository();
const emergencyRepository     = new MongooseEmergencyRepository();
const prescriptionRepository  = new MongoosePrescriptionRepository();

const authService             = new AuthService(userRepository);
const familyService           = new FamilyService(userRepository);
const medicineService         = new MedicineService(medicineRepository);
const medicineLogsService     = new MedicineLogsService(medicineLogsRepository);
const healthCheckService      = new HealthCheckService(healthCheckRepository);
const doctorService           = new DoctorService(doctorRepository);
const appointmentService      = new AppointmentService(appointmentRepository, doctorRepository);
const emergencyService        = new EmergencyService(emergencyRepository);
const prescriptionService     = new PrescriptionService(prescriptionRepository);
const healthTrendService      = new HealthTrendService(
  healthCheckRepository,
  medicineLogsRepository,
  medicineRepository,
  prescriptionRepository,
  appointmentRepository,
);
const aiService               = new AiService(healthCheckService, medicineLogsService, medicineService);

const authController          = new AuthController(authService);
const familyController        = new FamilyController(familyService);
const medicineController      = new MedicineController(medicineService);
const medicineLogsController  = new MedicineLogsController(medicineLogsService);
const healthCheckController   = new HealthCheckController(healthCheckService);
const doctorController        = new DoctorController(doctorService);
const appointmentController   = new AppointmentController(appointmentService, doctorService);
const emergencyController     = new EmergencyController(emergencyService, doctorService);
const prescriptionController  = new PrescriptionController(prescriptionService);
const healthTrendController   = new HealthTrendController(healthTrendService);
const aiController            = new AiController(aiService);

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
app.use('/api/doctors',         createDoctorRouter(doctorController));
app.use('/api/appointments',    createAppointmentRouter(appointmentController));
app.use('/api/emergency',       createEmergencyRouter(emergencyController));
app.use('/api/prescriptions',   createPrescriptionRouter(prescriptionController));
app.use('/api/health-trend',    createHealthTrendRouter(healthTrendController));
app.use('/api/ai',              createAiRouter(aiController));

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
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error('❌  Failed to connect to MongoDB:', err);
    process.exit(1);
  });
