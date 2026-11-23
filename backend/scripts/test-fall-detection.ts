/**
 * Test script for Fall Detection Backend Module.
 * Run with: npx tsx scripts/test-fall-detection.ts
 */

import { FallDetectionService, ForbiddenError, NotFoundError, ValidationError } from '../src/fall-detection/fall-detection.service';
import type { FallEvent, FallNotification } from '../src/fall-detection/fall-detection.types';
import type { IFallEventRepository } from '../src/db/fall-event.repository';
import type { IFallNotificationRepository } from '../src/db/fall-notification.repository';
import type { IUserRepository } from '../src/db/user.repository';
import type { User } from '../src/auth/auth.types';
import type { FamilyProfile } from '../src/family/family.types';

// In-memory test repository implementations
class MockFallEventRepository implements IFallEventRepository {
  public events: FallEvent[] = [];

  async create(event: FallEvent): Promise<FallEvent> {
    this.events.push(event);
    return event;
  }

  async findById(id: string): Promise<FallEvent | undefined> {
    return this.events.find((e) => e.id === id);
  }

  async findByPatientId(patientId: string): Promise<FallEvent[]> {
    return this.events.filter((e) => e.patient_id === patientId);
  }

  async findByPatientIds(patientIds: string[]): Promise<FallEvent[]> {
    return this.events.filter((e) => patientIds.includes(e.patient_id));
  }

  async update(id: string, updates: Partial<FallEvent>): Promise<FallEvent | undefined> {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.events[idx] = { ...this.events[idx], ...updates } as FallEvent;
    return this.events[idx];
  }

  async findRecentDuplicate(patientId: string, windowMs: number = 10000): Promise<FallEvent | undefined> {
    const cutoff = Date.now() - windowMs;
    return this.events.find(
      (e) =>
        e.patient_id === patientId &&
        new Date(e.created_at).getTime() >= cutoff &&
        ['suspected', 'awaiting_response', 'acknowledged'].includes(e.status)
    );
  }
}

class MockFallNotificationRepository implements IFallNotificationRepository {
  public notifications: FallNotification[] = [];

  async create(notification: FallNotification): Promise<FallNotification> {
    this.notifications.push(notification);
    return notification;
  }

  async createMany(notifications: FallNotification[]): Promise<FallNotification[]> {
    this.notifications.push(...notifications);
    return notifications;
  }

  async findByRecipientId(recipientId: string): Promise<FallNotification[]> {
    return this.notifications.filter((n) => n.recipient_id === recipientId);
  }

  async markAsRead(id: string, recipientId: string): Promise<FallNotification | undefined> {
    const notif = this.notifications.find((n) => n.id === id && n.recipient_id === recipientId);
    if (!notif) return undefined;
    notif.status = 'read';
    notif.read_at = new Date().toISOString();
    return notif;
  }

  async findByEventId(eventId: string): Promise<FallNotification[]> {
    return this.notifications.filter((n) => n.event_id === eventId);
  }
}

class MockUserRepository implements IUserRepository {
  public users = new Map<string, User>();
  public familyProfiles: FamilyProfile[] = [];

  async findByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async createFamilyProfile(profile: FamilyProfile): Promise<FamilyProfile> {
    this.familyProfiles.push(profile);
    return profile;
  }

  async getFamilyProfilesByUserId(linkedToUserId: string): Promise<FamilyProfile[]> {
    return this.familyProfiles.filter((p) => p.linkedToUserId === linkedToUserId);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getLinkedCaregiverIds(patientId: string): Promise<string[]> {
    const ids = new Set<string>();
    for (const p of this.familyProfiles) {
      if (p.linkedToUserId === patientId && p.userId !== patientId) ids.add(p.userId);
      if (p.userId === patientId && p.linkedToUserId !== patientId) ids.add(p.linkedToUserId);
    }
    return Array.from(ids);
  }

  async getLinkedPatientIds(caregiverId: string): Promise<string[]> {
    const ids = new Set<string>();
    for (const p of this.familyProfiles) {
      if (p.userId === caregiverId && p.linkedToUserId !== caregiverId) ids.add(p.linkedToUserId);
      if (p.linkedToUserId === caregiverId && p.userId !== caregiverId) ids.add(p.userId);
    }
    return Array.from(ids);
  }
}

async function runTests() {
  console.log('--- Running Fall Detection Backend Tests ---');

  const eventRepo = new MockFallEventRepository();
  const notifRepo = new MockFallNotificationRepository();
  const userRepo = new MockUserRepository();
  const service = new FallDetectionService(eventRepo, notifRepo, userRepo);

  // Setup mock users: elderly patient and family caregiver
  const patientId = 'patient-001';
  const caregiverId = 'caregiver-001';
  const strangerId = 'stranger-999';

  await userRepo.create({
    id: patientId,
    fullName: 'Grandma Alice',
    birthdate: '1945-01-01',
    email: 'alice@example.com',
    passwordHash: 'hash',
    role: 'normal',
    createdAt: new Date().toISOString(),
  });

  await userRepo.create({
    id: caregiverId,
    fullName: 'Bob Caregiver',
    birthdate: '1975-01-01',
    email: 'bob@example.com',
    passwordHash: 'hash',
    role: 'family',
    createdAt: new Date().toISOString(),
  });

  // Link caregiver to patient
  await userRepo.createFamilyProfile({
    id: 'fp-1',
    userId: caregiverId,
    linkedToUserId: patientId,
    medicalCondition: 'Hypertension',
    emergencyContacts: ['Bob - Son (555-0100)'],
  });

  // Test 1: Patient creates fall event
  console.log('Test 1: Patient creates a fall event');
  const result1 = await service.createFallEvent(
    {
      fall_score: 0.92,
      severity: 'high',
      model_version: '1.0.0',
      window: { start_ms: 1000, end_ms: 3500 },
      description: 'High velocity drop detected',
    },
    patientId
  );

  if (!result1.event || result1.duplicate !== false) throw new Error('Test 1 Failed: event not created');
  if (result1.event.status !== 'awaiting_response') throw new Error('Test 1 Failed: wrong status');
  if (result1.event.patient_name !== 'Grandma Alice') throw new Error('Test 1 Failed: patient name not populated');
  console.log('✓ Test 1 Passed: Event created with ID:', result1.event.id);

  // Test 2: In-app notification generated for linked caregiver
  console.log('Test 2: Caregiver receives notification');
  const notifications = await service.getNotifications(caregiverId);
  if (notifications.length !== 1) throw new Error('Test 2 Failed: notification not generated');
  if (notifications[0]!.event_id !== result1.event.id) throw new Error('Test 2 Failed: wrong event_id in notification');
  console.log('✓ Test 2 Passed: Caregiver notification generated:', notifications[0]!.title);

  // Test 3: Duplicate event prevented within cooldown window
  console.log('Test 3: Duplicate prevention');
  const resultDup = await service.createFallEvent(
    {
      fall_score: 0.95,
      severity: 'high',
    },
    patientId
  );
  if (resultDup.duplicate !== true) throw new Error('Test 3 Failed: duplicate was not prevented');
  if (resultDup.event.id !== result1.event.id) throw new Error('Test 3 Failed: duplicate returned different event');
  console.log('✓ Test 3 Passed: Duplicate successfully prevented');

  // Test 4: Authorization - stranger cannot view patient events
  console.log('Test 4: Access control');
  let forbiddenCaught = false;
  try {
    await service.getEventsForPatient(patientId, strangerId);
  } catch (e) {
    if (e instanceof ForbiddenError) forbiddenCaught = true;
  }
  if (!forbiddenCaught) throw new Error('Test 4 Failed: stranger was not forbidden');
  console.log('✓ Test 4 Passed: Unauthorized access blocked');

  // Test 5: Caregiver views events for linked patient
  console.log('Test 5: Caregiver event retrieval');
  const caregiverEvents = await service.getEventsForCaregiver(caregiverId);
  if (caregiverEvents.length !== 1 || caregiverEvents[0]!.id !== result1.event.id) {
    throw new Error('Test 5 Failed: Caregiver could not retrieve linked patient event');
  }
  console.log('✓ Test 5 Passed: Caregiver retrieved linked event');

  // Test 6: Caregiver acknowledges event
  console.log('Test 6: Event acknowledgement');
  const ackEvent = await service.acknowledgeEvent(result1.event.id, caregiverId, 'Bob Caregiver');
  if (ackEvent.status !== 'acknowledged' || !ackEvent.acknowledged_at) {
    throw new Error('Test 6 Failed: event status not updated to acknowledged');
  }
  console.log('✓ Test 6 Passed: Event acknowledged by Bob Caregiver');

  // Test 7: Caregiver resolves event
  console.log('Test 7: Event resolution');
  const resEvent = await service.resolveEvent(result1.event.id, caregiverId, 'Bob Caregiver');
  if (resEvent.status !== 'resolved' || !resEvent.resolved_at) {
    throw new Error('Test 7 Failed: event status not updated to resolved');
  }
  console.log('✓ Test 7 Passed: Event resolved');

  // Test 8: Invalid transition - cannot acknowledge or false-alarm already resolved event
  console.log('Test 8: Invalid state transition validation');
  let invalidTransitionCaught = false;
  try {
    await service.acknowledgeEvent(result1.event.id, caregiverId);
  } catch (e) {
    if (e instanceof ValidationError) invalidTransitionCaught = true;
  }
  if (!invalidTransitionCaught) throw new Error('Test 8 Failed: invalid transition was allowed');
  console.log('✓ Test 8 Passed: Invalid transition blocked on resolved event');

  // Test 9: False alarm workflow
  console.log('Test 9: False alarm workflow');
  // Create another event for test
  const event2 = await eventRepo.create({
    id: 'event-002',
    patient_id: patientId,
    status: 'awaiting_response',
    severity: 'high',
    fall_score: 0.75,
    model_version: '1.0.0',
    window: { start_ms: 5000, end_ms: 7500 },
    detected_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient_name: 'Grandma Alice',
  });

  const falseAlarmEvent = await service.markFalseAlarm('event-002', patientId, 'Grandma Alice');
  if (falseAlarmEvent.status !== 'false_alarm' || !falseAlarmEvent.false_alarm_at) {
    throw new Error('Test 9 Failed: status was not false_alarm');
  }
  console.log('✓ Test 9 Passed: Event successfully marked false_alarm by patient');

  // Test 10: Caregiver marks notification as read
  console.log('Test 10: Notification read state');
  const readNotif = await service.markNotificationRead(notifications[0]!.id, caregiverId);
  if (readNotif.status !== 'read' || !readNotif.read_at) {
    throw new Error('Test 10 Failed: notification not marked as read');
  }
  console.log('✓ Test 10 Passed: Notification marked as read');

  console.log('\n ALL 10 BACKEND FALL DETECTION TESTS PASSED SUCCESSFULLY! \n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
