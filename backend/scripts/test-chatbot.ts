/**
 * test-chatbot.ts
 *
 * Automated verification test for Phase 2:
 * 1. Unit tests for ChatbotService.classifyIntent directly
 * 2. Integration tests for POST /api/chatbot/intent HTTP endpoint
 * 3. Input validation tests (empty, missing, invalid type)
 * 4. Authorization check on /api/chatbot/ask
 */

import express from 'express';
import { ChatbotService } from '../src/chatbot/chatbot.service';
import { ChatbotController } from '../src/chatbot/chatbot.controller';
import { createChatbotRouter } from '../src/chatbot/chatbot.router';
import type { IUserRepository } from '../src/db/user.repository';

// Mock repository for testing router wiring
const mockUserRepository: IUserRepository = {
  findByEmail: async () => undefined,
  create: async (u) => u,
  createFamilyProfile: async (p) => p,
  getFamilyProfilesByUserId: async () => [],
};

async function runTests() {
  console.log('====================================================');
  console.log(' Starting Phase 2 Chatbot Integration Tests');
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

  // ── Step 1: Direct Service Tests ───────────────────────────────────────────
  console.log('--- 1. Testing ChatbotService.classifyIntent Directly ---');
  const service = new ChatbotService(null as any, null as any, null as any, null as any);

  // Test 1: medicine_timing
  try {
    const res = await service.classifyIntent('Is mom taking her medicines on time?');
    console.log('   Input: "Is mom taking her medicines on time?"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'medicine_timing', `Expected intent 'medicine_timing', got '${res.intent}'`);
    assert(typeof res.confidence === 'number' && res.confidence >= 0 && res.confidence <= 1, `Confidence must be between 0 and 1, got ${res.confidence}`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // Test 2: medicine_today
  try {
    const res = await service.classifyIntent('Did mom take her medicine today?');
    console.log('   Input: "Did mom take her medicine today?"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'medicine_today', `Expected intent 'medicine_today', got '${res.intent}'`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // Test 3: medicine_missed
  try {
    const res = await service.classifyIntent('Which medicines did she miss?');
    console.log('   Input: "Which medicines did she miss?"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'medicine_missed', `Expected intent 'medicine_missed', got '${res.intent}'`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // Test 4: sugar_trend
  try {
    const res = await service.classifyIntent('How has her blood sugar been recently?');
    console.log('   Input: "How has her blood sugar been recently?"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'sugar_trend', `Expected intent 'sugar_trend', got '${res.intent}'`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // Test 5: unrelated question (unknown)
  try {
    const res = await service.classifyIntent('Tell me a funny joke about cats');
    console.log('   Input: "Tell me a funny joke about cats"');
    console.log('   Output:', JSON.stringify(res));
    assert(res.intent === 'unknown', `Expected intent 'unknown', got '${res.intent}'`);
  } catch (err) {
    assert(false, `Unexpected error: ${(err as Error).message}`);
  }

  // Test 6: empty string rejected
  try {
    await service.classifyIntent('   ');
    assert(false, 'Expected empty question to throw error');
  } catch (err) {
    assert(true, `Empty question correctly threw error: ${(err as Error).message}`);
  }

  // ── Step 2: Express HTTP Endpoint Tests ────────────────────────────────────
  console.log('\n--- 2. Testing Express POST /api/chatbot/intent Endpoint ---');

  const app = express();
  app.use(express.json());
  const controller = new ChatbotController(service);
  app.use('/api/chatbot', createChatbotRouter(controller, mockUserRepository));

  // Start temporary local test server on an ephemeral port
  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // HTTP Test 1: Valid question
    const postRes1 = await fetch(`${baseUrl}/api/chatbot/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Is mom taking her medicines on time?' }),
    });
    const data1 = (await postRes1.json()) as any;
    assert(postRes1.status === 200, `Expected 200 OK, got ${postRes1.status}`);
    assert(data1.intent === 'medicine_timing', `Expected intent 'medicine_timing', got '${data1.intent}'`);
    assert(typeof data1.confidence === 'number', `Expected numeric confidence, got ${typeof data1.confidence}`);

    // HTTP Test 2: Empty question in body -> 400 Bad Request
    const postRes2 = await fetch(`${baseUrl}/api/chatbot/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '' }),
    });
    const data2 = (await postRes2.json()) as any;
    assert(postRes2.status === 400, `Expected 400 Bad Request for empty question, got ${postRes2.status}`);
    assert(typeof data2.error === 'string', `Expected error message in response, got: ${JSON.stringify(data2)}`);

    // HTTP Test 3: Missing question field -> 400 Bad Request
    const postRes3 = await fetch(`${baseUrl}/api/chatbot/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otherField: 'hello' }),
    });
    const data3 = (await postRes3.json()) as any;
    assert(postRes3.status === 400, `Expected 400 Bad Request for missing question, got ${postRes3.status}`);

    // HTTP Test 4: Invalid question type (number) -> 400 Bad Request
    const postRes4 = await fetch(`${baseUrl}/api/chatbot/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 12345 }),
    });
    assert(postRes4.status === 400, `Expected 400 Bad Request for non-string question, got ${postRes4.status}`);

    // HTTP Test 5: POST /api/chatbot/ask without token -> 401 Unauthorized
    const postRes5 = await fetch(`${baseUrl}/api/chatbot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Did mom take medicine today?' }),
    });
    assert(postRes5.status === 401, `Expected 401 Unauthorized for /api/chatbot/ask without JWT, got ${postRes5.status}`);

  } finally {
    server.close();
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
