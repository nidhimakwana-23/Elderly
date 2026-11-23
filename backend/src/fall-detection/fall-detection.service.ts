import { randomUUID } from 'crypto';
import type { IFallEventRepository } from '../db/fall-event.repository';
import type { IFallNotificationRepository } from '../db/fall-notification.repository';
import type { IUserRepository } from '../db/user.repository';
import type {
  CreateFallEventDto,
  FallEvent,
  FallNotification,
  PredictRequest,
} from './fall-detection.types';
import { DEFAULT_INFERENCE_SERVICE_URL } from './fall-detection.constants';
import { logger } from '../utils/logger';

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FallDetectionService {
  constructor(
    private readonly fallEventRepository: IFallEventRepository,
    private readonly fallNotificationRepository: IFallNotificationRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Helper to verify if caller is authorized for a patient's data.
   */
  private async verifyPatientAccess(callerId: string, patientId: string): Promise<boolean> {
    if (callerId === patientId) return true;

    if (this.userRepository.getLinkedCaregiverIds) {
      const caregivers = await this.userRepository.getLinkedCaregiverIds(patientId);
      if (caregivers.includes(callerId)) return true;
    }

    if (this.userRepository.getLinkedPatientIds) {
      const patients = await this.userRepository.getLinkedPatientIds(callerId);
      if (patients.includes(patientId)) return true;
    }

    const profiles = await this.userRepository.getFamilyProfilesByUserId(callerId);
    return profiles.some((p) => p.userId === patientId);
  }

  async createFallEvent(
    dto: CreateFallEventDto,
    callerId: string
  ): Promise<{ event: FallEvent; duplicate: boolean }> {
    const patientId = dto.patient_id || callerId;

    const hasAccess = await this.verifyPatientAccess(callerId, patientId);
    if (!hasAccess) {
      throw new ForbiddenError('You are not authorized to create a fall event for this patient.');
    }

    // Check duplicate within 10s cooldown
    const existing = await this.fallEventRepository.findRecentDuplicate(patientId, 10000);
    if (existing) {
      logger.info(`[FallDetectionService] Duplicate fall event prevented for patient ${patientId}`);
      return { event: existing, duplicate: true };
    }

    let patientName = 'Patient';
    if (this.userRepository.findById) {
      const user = await this.userRepository.findById(patientId);
      if (user?.fullName) {
        patientName = user.fullName;
      }
    }

    const now = new Date().toISOString();
    const event: FallEvent = {
      id: randomUUID(),
      patient_id: patientId,
      status: 'awaiting_response',
      severity: dto.severity || 'high',
      fall_score: dto.fall_score,
      model_version: dto.model_version || '1.0.0',
      window: dto.window || { start_ms: null, end_ms: null },
      detected_at: dto.detected_at || now,
      acknowledged_at: null,
      resolved_at: null,
      false_alarm_at: null,
      acknowledged_by: null,
      resolved_by: null,
      description: dto.description || 'Potential fall pattern detected.',
      patient_name: patientName,
      created_at: now,
      updated_at: now,
    };

    const savedEvent = await this.fallEventRepository.create(event);

    // Notify linked caregivers
    try {
      let caregiverIds: string[] = [];
      if (this.userRepository.getLinkedCaregiverIds) {
        caregiverIds = await this.userRepository.getLinkedCaregiverIds(patientId);
      } else {
        const profiles = await this.userRepository.getFamilyProfilesByUserId(patientId);
        caregiverIds = profiles.map((p) => p.userId);
      }

      if (caregiverIds.length > 0) {
        const notifications: FallNotification[] = caregiverIds.map((cid) => ({
          id: randomUUID(),
          recipient_id: cid,
          patient_id: patientId,
          event_id: savedEvent.id,
          type: 'fall_detected',
          title: `⚠️ Potential Fall Detected: ${patientName}`,
          message: `A potential fall (risk score: ${(dto.fall_score * 100).toFixed(0)}%) was detected for ${patientName}. Immediate attention may be required.`,
          status: 'unread',
          created_at: now,
          read_at: null,
        }));

        await this.fallNotificationRepository.createMany(notifications);
        logger.info(`[FallDetectionService] Created ${notifications.length} caregiver notification(s) for event ${savedEvent.id}`);
      }
    } catch (notifErr) {
      logger.error('[FallDetectionService] Error sending caregiver notifications:', notifErr);
    }

    return { event: savedEvent, duplicate: false };
  }

  async getEventsForPatient(patientId: string, callerId: string): Promise<FallEvent[]> {
    const hasAccess = await this.verifyPatientAccess(callerId, patientId);
    if (!hasAccess) {
      throw new ForbiddenError('You are not authorized to view fall events for this patient.');
    }
    return this.fallEventRepository.findByPatientId(patientId);
  }

  async getEventsForCaregiver(caregiverId: string): Promise<FallEvent[]> {
    let patientIds: string[] = [];
    if (this.userRepository.getLinkedPatientIds) {
      patientIds = await this.userRepository.getLinkedPatientIds(caregiverId);
    } else {
      const profiles = await this.userRepository.getFamilyProfilesByUserId(caregiverId);
      patientIds = profiles.map((p) => p.userId);
    }

    if (patientIds.length === 0) {
      return [];
    }

    return this.fallEventRepository.findByPatientIds(patientIds);
  }

  async getEventById(id: string, callerId: string): Promise<FallEvent> {
    const event = await this.fallEventRepository.findById(id);
    if (!event) {
      throw new NotFoundError(`Fall event with id ${id} not found.`);
    }

    const hasAccess = await this.verifyPatientAccess(callerId, event.patient_id);
    if (!hasAccess) {
      throw new ForbiddenError('You are not authorized to view this fall event.');
    }

    return event;
  }

  async acknowledgeEvent(id: string, callerId: string, callerName?: string): Promise<FallEvent> {
    const event = await this.getEventById(id, callerId);

    if (event.status === 'resolved' || event.status === 'false_alarm') {
      throw new ValidationError(`Cannot acknowledge an event that is already ${event.status}.`);
    }

    const now = new Date().toISOString();
    const updated = await this.fallEventRepository.update(id, {
      status: 'acknowledged',
      acknowledged_at: now,
      acknowledged_by: callerName || callerId,
      updated_at: now,
    });

    if (!updated) {
      throw new NotFoundError(`Fall event with id ${id} not found.`);
    }

    return updated;
  }

  async resolveEvent(id: string, callerId: string, callerName?: string): Promise<FallEvent> {
    const event = await this.getEventById(id, callerId);

    if (event.status === 'false_alarm') {
      throw new ValidationError('Cannot resolve an event marked as a false alarm.');
    }

    const now = new Date().toISOString();
    const updated = await this.fallEventRepository.update(id, {
      status: 'resolved',
      resolved_at: now,
      resolved_by: callerName || callerId,
      updated_at: now,
    });

    if (!updated) {
      throw new NotFoundError(`Fall event with id ${id} not found.`);
    }

    return updated;
  }

  async markFalseAlarm(id: string, callerId: string, callerName?: string): Promise<FallEvent> {
    const event = await this.getEventById(id, callerId);

    if (event.status === 'resolved') {
      throw new ValidationError('Cannot mark an already resolved event as a false alarm.');
    }

    const now = new Date().toISOString();
    const updated = await this.fallEventRepository.update(id, {
      status: 'false_alarm',
      false_alarm_at: now,
      resolved_by: callerName || callerId,
      updated_at: now,
    });

    if (!updated) {
      throw new NotFoundError(`Fall event with id ${id} not found.`);
    }

    return updated;
  }

  async getNotifications(recipientId: string): Promise<FallNotification[]> {
    return this.fallNotificationRepository.findByRecipientId(recipientId);
  }

  async markNotificationRead(id: string, recipientId: string): Promise<FallNotification> {
    const updated = await this.fallNotificationRepository.markAsRead(id, recipientId);
    if (!updated) {
      throw new NotFoundError(`Notification ${id} not found.`);
    }
    return updated;
  }

  async predictWindow(payload: PredictRequest): Promise<any> {
    const url = `${DEFAULT_INFERENCE_SERVICE_URL}/internal/v1/predict`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`Inference service returned status ${response.status}: ${errorText}`);
        return {
          label: null,
          fall_score: 0.0,
          is_valid: false,
          reason: `Inference service error: ${response.statusText}`,
          model_version: 'unknown',
          window: { start_ms: null, end_ms: null },
        };
      }

      return await response.json();
    } catch (err: any) {
      logger.error('Failed to communicate with Python inference service:', err);
      return {
        label: null,
        fall_score: 0.0,
        is_valid: false,
        reason: `Inference service unreachable (${err.message || err})`,
        model_version: 'unknown',
        window: { start_ms: null, end_ms: null },
      };
    }
  }
}
