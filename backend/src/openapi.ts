import swaggerJsdoc from 'swagger-jsdoc';
import { z } from 'zod';
import { MedicineSchema, CreateMedicineDtoSchema, UpdateMedicineDtoSchema } from './medicine/medicine.types.js';
import { FamilyProfileSchema, CreateFamilyProfileInputSchema } from './family/family.types.js';
import { UserSchema, SignupInputSchema, LoginInputSchema, JwtPayloadSchema, DoctorSignupInputSchema } from './auth/auth.types.js';
import { HealthCheckSchema, CreateHealthCheckDtoSchema, UpdateHealthCheckDtoSchema } from './health-check/health-check.types.js';
import { DoctorProfileSchema, CreateDoctorProfileDtoSchema, UpdateDoctorProfileDtoSchema, UpdateAvailabilityDtoSchema } from './doctor/doctor.types.js';
import { AppointmentSchema, CreateAppointmentDtoSchema } from './appointment/appointment.types.js';
import { EmergencyRequestSchema, CreateEmergencyDtoSchema } from './emergency/emergency.types.js';
import { PrescriptionSchema, CreatePrescriptionDtoSchema } from './prescription/prescription.types.js';

export const swaggerOptions = {
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
        UpdateDoctorProfileDto: z.toJSONSchema(UpdateDoctorProfileDtoSchema, { target: 'openapi-3.0' }),
        UpdateAvailabilityDto: z.toJSONSchema(UpdateAvailabilityDtoSchema, { target: 'openapi-3.0' }),
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

export const openapiSpec = swaggerJsdoc(swaggerOptions);
