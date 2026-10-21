/**
 * test-chatbot.ts
 *
 * Automated verification test suite for Chatbot Phases 2 & 3:
 * 1. Intent classifier invocation via Python subprocess
 * 2. POST /api/chatbot/intent endpoint (public classifier-only)
 * 3. POST /api/chatbot/ask endpoint (protected end-to-end flow)
 * 4. Intent dispatcher: routing 'medicine_today' to dedicated handler
 * 5. Data-backed answers for today's medicines (taken, pending, missed, skipped)
 * 6. Handling when active medicines exist but no logs recorded today
 * 7. Handling when no medicine records exist at all
 * 8. Patient data isolation between different patients
 * 9. Authorization enforcement (401 without JWT, 403 when unlinked, 200 when authorized or self)
 * 10. Fallbacks for unknown / low-confidence questions
 * 11. Graceful fallback for out-of-scope intents (the other 7 intents)
 * 12. Resilience: safe handling of classifier failures (503) and service errors (500)
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { ChatbotService } from '../src/chatbot/chatbot.service';
import { ChatbotController } from '../src/chatbot/chatbot.controller';
import { createChatbotRouter } from '../src/chatbot/chatbot.router';
import type { IUserRepository } from '../src/db/user.repository';
import type { MedicineLogsService } from '../src/medicine-logs/medicine-logs.service';
import type { MedicineService } from '../src/medicine/medicine.service';
import type { MedicineLog } from '../src/medicine-logs/medicine-logs.types';
import type { Medicine } from '../src/medicine/medicine.types';
import { HealthTrendService } from '../src/health-trend/health-trend.service';
import { HealthCheckService } from '../src/health-check/health-check.service';

// Ensure JWT secret is set for tests
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] || 'test-jwt-secret-key-12345';
const JWT_SECRET = process.env['JWT_SECRET'];

const todayString = new Date().toISOString().split('T')[0]!;

// Test patient and user IDs
const CAREGIVER_ID = 'caregiver-uuid-001';
const PATIENT_ONE_ID = 'patient-uuid-001';
const PATIENT_TWO_ID = 'patient-uuid-002';
const PATIENT_THREE_ID = 'patient-uuid-003';
const STRANGER_ID = 'stranger-uuid-999';

// Helpers to generate test JWTs
function createToken(userId: string, email = 'test@example.com'): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: '1h' });
}

const caregiverToken = createToken(CAREGIVER_ID, 'caregiver@example.com');
const patientOneToken = createToken(PATIENT_ONE_ID, 'patient1@example.com');
const strangerToken = createToken(STRANGER_ID, 'stranger@example.com');

// ── Mock Repositories and Services ───────────────────────────────────────────

// Mock UserRepository: CAREGIVER_ID is linked to PATIENT_ONE_ID
const mockUserRepository: IUserRepository = {
  findByEmail: async () => undefined,
  create: async (u) => u,
  createFamilyProfile: async (p) => p,
  getFamilyProfilesByUserId: async (linkedToUserId: string) => {
    if (linkedToUserId === CAREGIVER_ID) {
      return [
        {
          id: 'fam-1',
          userId: PATIENT_ONE_ID,
          linkedToUserId: CAREGIVER_ID,
          medicalCondition: 'Hypertension',
          emergencyContacts: ['1234567890'],
        },
      ];
    }
    return [];
  },
};

// Patient 1 has actual logs for today
const patientOneLogs: MedicineLog[] = [
  {
    id: 'log-1',
    medicineId: 'med-1',
    elderlyId: PATIENT_ONE_ID,
    medicineName: 'Metformin',
    dosage: '500mg',
    scheduledDate: todayString,
    scheduledTime: '08:00 AM',
    takenTime: '08:15 AM',
    status: 'Taken',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'log-2',
    medicineId: 'med-2',
    elderlyId: PATIENT_ONE_ID,
    medicineName: 'Amlodipine',
    dosage: '5mg',
    scheduledDate: todayString,
    scheduledTime: '20:00',
    takenTime: null,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'log-3',
    medicineId: 'med-3',
    elderlyId: PATIENT_ONE_ID,
    medicineName: 'Vitamin D3',
    dosage: '1000IU',
    scheduledDate: todayString,
    scheduledTime: '12:00 PM',
    takenTime: null,
    status: 'Missed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Patient 2 has active medicines but no logs for today
const patientTwoMedicines: Medicine[] = [
  {
    id: 'med-201',
    patient_id: PATIENT_TWO_ID,
    medicine_name: 'Lisinopril',
    medicine_type: 'Tablet',
    dosage: '10mg',
    frequency: 'Once Daily',
    timing: ['09:00'],
    start_date: '2026-01-01',
    reminder_enabled: true,
    reminder_times: ['09:00'],
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'med-202',
    patient_id: PATIENT_TWO_ID,
    medicine_name: 'Atorvastatin',
    medicine_type: 'Tablet',
    dosage: '20mg',
    frequency: 'Once Daily',
    timing: ['21:00'],
    start_date: '2026-01-01',
    reminder_enabled: true,
    reminder_times: ['21:00'],
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock MedicineLogsService
const mockMedicineLogsService = {
  getMedicineHistory: async (elderlyId: string, date?: string): Promise<MedicineLog[]> => {
    if (elderlyId === PATIENT_ONE_ID) {
      if (date) {
        return patientOneLogs.filter((l) => l.scheduledDate === date);
      }
      return patientOneLogs;
    }
    return [];
  },
} as unknown as MedicineLogsService;

const mockHealthCheckService = {

} as unknown as HealthCheckService;

const mockHealthTrendService = {

} as unknown as HealthTrendService;

// Mock MedicineService
const mockMedicineService = {
  getMedicines: async (patientId: string): Promise<Medicine[]> => {
    if (patientId === PATIENT_TWO_ID) {
      return patientTwoMedicines;
    }
    if (patientId === PATIENT_ONE_ID) {
      return [
        {
          id: 'med-1',
          patient_id: PATIENT_ONE_ID,
          medicine_name: 'Metformin',
          medicine_type: 'Tablet',
          dosage: '500mg',
          frequency: 'Once Daily',
          timing: ['08:00'],
          start_date: '2026-01-01',
          reminder_enabled: true,
          reminder_times: ['08:00'],
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
    return [];
  },
} as unknown as MedicineService;

async function runTests() {
  console.log('====================================================');
  console.log(' Starting End-to-End Chatbot Test Suite (Phases 2 & 3)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ── Section 1: Intent Classifier via Python Subprocess ─────────────────────
  console.log('--- 1. Testing Standalone ML Intent Classifier ---');
  const service = new ChatbotService(mockMedicineLogsService, mockHealthCheckService, mockHealthTrendService, mockMedicineService);

  try {
    const res = await service.classifyIntent('Did mom take her medicine today?');
    console.log('   Input: "Did mom take her medicine today?"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'medicine_today', `Predicted intent must be 'medicine_today', got '${res.intent}'`);
    assert(typeof res.confidence === 'number' && res.confidence >= 0 && res.confidence <= 1, `Confidence must be between 0 and 1, got ${res.confidence}`);
  } catch (err) {
    assert(false, `Unexpected classifier error: ${(err as Error).message}`);
  }

  try {
    const res = await service.classifyIntent('What is the weather in Paris today?');
    console.log('   Input: "What is the weather in Paris today?" (unrelated)');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'unknown', `Expected 'unknown' intent for unrelated query, got '${res.intent}'`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // ── Section 2: Dedicated medicine_today Handler ────────────────────────────
  console.log('\n--- 2. Testing Dedicated handleMedicineToday Handler ---');

  // Case 2a: Patient 1 has logs today (1 Taken, 1 Pending, 1 Missed)
  const answer1 = await service.handleMedicineToday(PATIENT_ONE_ID);
  console.log('   Patient 1 (with logs) Answer:\n', answer1.split('\n').map((l) => '     ' + l).join('\n'));
  assert(answer1.includes('Metformin') && answer1.includes('Taken'), 'Answer must mention Metformin as Taken');
  assert(answer1.includes('Amlodipine') && answer1.includes('Pending'), 'Answer must mention Amlodipine as Pending');
  assert(answer1.includes('Vitamin D3') && answer1.includes('Missed'), 'Answer must mention Vitamin D3 as Missed');

  // Case 2b: Patient 2 has active medicines but no logs recorded today
  const answer2 = await service.handleMedicineToday(PATIENT_TWO_ID);
  console.log('\n   Patient 2 (no logs, active prescriptions) Answer:\n     ' + answer2);
  assert(answer2.includes('No medicine logs have been recorded for today'), 'Must state no logs recorded for today yet');
  assert(answer2.includes('Lisinopril') && answer2.includes('Atorvastatin'), 'Must list active prescriptions');

  // Case 2c: Patient 3 has no medicines registered
  const answer3 = await service.handleMedicineToday(PATIENT_THREE_ID);
  console.log('\n   Patient 3 (no records) Answer:\n     ' + answer3);
  assert(answer3.includes('No medicine records or logs were found'), 'Must report no records or logs found');

  // ── Section 3: Chatbot Dispatcher buildAnswer ──────────────────────────────
  console.log('\n--- 3. Testing Chatbot Dispatcher (buildAnswer) ---');

  // 3a: medicine_today intent
  const disp1 = await service.buildAnswer({ intent: 'medicine_today', confidence: 0.9 }, PATIENT_ONE_ID);
  assert(disp1.intent === 'medicine_today', 'Dispatcher must retain medicine_today intent');
  assert(disp1.answer.includes('Metformin'), 'Dispatcher answer must contain data-backed answer');

  // 3b: out-of-scope intent (e.g. sugar_trend)
  const disp2 = await service.buildAnswer({ intent: 'sugar_trend', confidence: 0.85 }, PATIENT_ONE_ID);
  console.log('   Out-of-scope intent answer: ', disp2.answer);
  assert(disp2.answer.includes('not yet enabled in this phase'), 'Out-of-scope intents must gracefully explain they are not enabled yet');

  // 3c: unknown intent / low confidence
  const disp3 = await service.buildAnswer({ intent: 'unknown', confidence: 0.4 }, PATIENT_ONE_ID);
  assert(disp3.intent === 'unknown', 'Low confidence must map to unknown intent');
  assert(disp3.answer.includes('enough confidence'), 'Must return safe fallback message on low confidence');

  // ── Section 4: Express HTTP Endpoints Integration ──────────────────────────
  console.log('\n--- 4. Testing Express HTTP Endpoints (Router & Controller) ---');

  const app = express();
  app.use(express.json());
  const controller = new ChatbotController(service, mockUserRepository);
  app.use('/api/chatbot', createChatbotRouter(controller, mockUserRepository));

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 4.1 POST /api/chatbot/intent (Phase 2 regression check)
    const intentRes = await fetch(`${baseUrl}/api/chatbot/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Did mom take her medicine today?' }),
    });
    const intentData = (await intentRes.json()) as any;
    assert(intentRes.status === 200, `/api/chatbot/intent returns 200 (got ${intentRes.status})`);
    assert(intentData.intent === 'medicine_today', `Classifier returned 'medicine_today' (got '${intentData.intent}')`);

    // 4.2 POST /api/chatbot/ask - Missing auth token -> 401 Unauthorized
    const unauthRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Did mom take her medicine today?' }),
    });
    assert(unauthRes.status === 401, `/api/chatbot/ask without token returns 401 (got ${unauthRes.status})`);

    // 4.3 POST /api/chatbot/ask - Authorized caregiver querying linked patient
    const authCaregiverRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiverToken}`,
      },
      body: JSON.stringify({
        question: 'Did mom take her medicine today?',
        patientId: PATIENT_ONE_ID,
      }),
    });
    const caregiverData = (await authCaregiverRes.json()) as any;
    console.log('\n   HTTP /api/chatbot/ask (Caregiver querying Patient 1):');
    console.log('   Response status:', authCaregiverRes.status);
    console.log('   Response body:\n', JSON.stringify(caregiverData, null, 2));
    assert(authCaregiverRes.status === 200, `Authorized caregiver request returns 200 (got ${authCaregiverRes.status})`);
    assert(caregiverData.intent === 'medicine_today', `Response has intent 'medicine_today'`);
    assert(caregiverData.answer.includes('Metformin') && caregiverData.answer.includes('Taken'), 'Response answer contains Metformin Taken');

    // 4.4 POST /api/chatbot/ask - Patient querying own data (defaults to req.user.id)
    const selfRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientOneToken}`,
      },
      body: JSON.stringify({
        question: 'Has she taken today\'s medicine?',
      }),
    });
    const selfData = (await selfRes.json()) as any;
    assert(selfRes.status === 200, `Self-query returns 200 (got ${selfRes.status})`);
    assert(selfData.answer.includes('Metformin'), 'Self-query returns own medicine status');

    // 4.5 POST /api/chatbot/ask - Unauthorized stranger querying Patient 1 -> 403 Forbidden
    const forbiddenRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${strangerToken}`,
      },
      body: JSON.stringify({
        question: 'Did she take today\'s medicine?',
        patientId: PATIENT_ONE_ID,
      }),
    });
    const forbiddenData = (await forbiddenRes.json()) as any;
    assert(forbiddenRes.status === 403, `Unauthorized user querying another patient returns 403 (got ${forbiddenRes.status})`);
    assert(forbiddenData.error?.includes('Access denied'), 'Error message indicates access denied');

    // 4.6 Patient Data Isolation: Caregiver querying Patient 2 (active meds, no logs)
    // To test isolation, let's link caregiver to Patient 2 in mock
    mockUserRepository.getFamilyProfilesByUserId = async () => [
      { id: 'fam-2', userId: PATIENT_TWO_ID, linkedToUserId: CAREGIVER_ID, medicalCondition: 'None', emergencyContacts: [] },
    ];
    const isolatedRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiverToken}`,
      },
      body: JSON.stringify({
        question: 'Did mom take her medicine today?',
        patientId: PATIENT_TWO_ID,
      }),
    });
    const isolatedData = (await isolatedRes.json()) as any;
    assert(isolatedRes.status === 200, 'Query for Patient 2 returns 200');
    assert(isolatedData.answer.includes('Lisinopril') && !isolatedData.answer.includes('Metformin'), 'Data isolation: Patient 2 response must contain Lisinopril and NOT Patient 1\'s Metformin');

    // 4.7 Input Validation: Empty question -> 400 Bad Request
    const emptyQRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiverToken}`,
      },
      body: JSON.stringify({ question: '   ' }),
    });
    assert(emptyQRes.status === 400, `Empty question returns 400 (got ${emptyQRes.status})`);

    // 4.8 Robustness: Unrelated query in /ask produces safe fallback
    const fallbackRes = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientOneToken}`,
      },
      body: JSON.stringify({ question: 'How is the weather outside today?' }),
    });
    const fallbackData = (await fallbackRes.json()) as any;
    assert(fallbackRes.status === 200, `Fallback request returns 200`);
    assert(fallbackData.intent === 'unknown', `Intent is 'unknown'`);
    assert(fallbackData.answer.includes('confidence') || fallbackData.answer.includes('today\'s medicines'), 'Answer directs user to today\'s medicines');

  } finally {
    server.close();
  }

  // ── Section 5: Failure Mode Testing (Server does not crash) ───────────────
  console.log('\n--- 5. Testing Service Failure Modes & Server Resilience ---');

  // 5.1 Classifier failure (e.g. invalid script path or spawn error)
  const brokenClassifierService = new ChatbotService(mockMedicineLogsService, mockHealthCheckService, mockHealthTrendService, mockMedicineService);
  // Monkey-patch classifyIntent to throw error simulating subprocess failure
  brokenClassifierService.classifyIntent = async () => {
    throw new Error('Simulated Python process crash');
  };

  const appFail = express();
  appFail.use(express.json());
  const failController = new ChatbotController(brokenClassifierService, mockUserRepository);
  appFail.use('/api/chatbot', createChatbotRouter(failController, mockUserRepository));

  const failServer = await new Promise<import('http').Server>((resolve) => {
    const s = appFail.listen(0, () => resolve(s));
  });
  const failPort = (failServer.address() as any).port;

  try {
    const failRes = await fetch(`http://127.0.0.1:${failPort}/api/chatbot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientOneToken}`,
      },
      body: JSON.stringify({ question: 'Did mom take her medicine today?' }),
    });
    const failData = (await failRes.json()) as any;
    assert(failRes.status === 503, `Subprocess failure safely returns 503 Service Unavailable (got ${failRes.status})`);
    assert(typeof failData.error === 'string', 'Returns clean error JSON without leaking stack trace');

    // 5.2 Database failure
    const brokenDbService = new ChatbotService(
      {
        getMedicineHistory: async () => {
          throw new Error('Simulated MongoDB connection drop');
        },
      } as unknown as MedicineLogsService,
      mockHealthCheckService,
      mockHealthTrendService,
      mockMedicineService,
    );
    // Working classifier
    brokenDbService.classifyIntent = async () => ({ intent: 'medicine_today', confidence: 0.9 });

    const dbFailController = new ChatbotController(brokenDbService, mockUserRepository);
    const appDbFail = express();
    appDbFail.use(express.json());
    appDbFail.use('/api/chatbot', createChatbotRouter(dbFailController, mockUserRepository));

    const dbFailServer = await new Promise<import('http').Server>((resolve) => {
      const s = appDbFail.listen(0, () => resolve(s));
    });
    const dbFailPort = (dbFailServer.address() as any).port;

    try {
      const dbFailRes = await fetch(`http://127.0.0.1:${dbFailPort}/api/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientOneToken}`,
        },
        body: JSON.stringify({ question: 'Did mom take her medicine today?' }),
      });
      const dbFailData = (await dbFailRes.json()) as any;
      assert(dbFailRes.status === 500, `Database failure safely returns 500 (got ${dbFailRes.status})`);
      assert(typeof dbFailData.error === 'string', 'Returns clean error JSON without server crash');
    } finally {
      dbFailServer.close();
    }
  } finally {
    failServer.close();
  }

  console.log('\n====================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
