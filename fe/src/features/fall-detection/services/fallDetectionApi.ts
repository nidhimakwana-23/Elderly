/**
 * API client service for Fall Detection backend communication.
 */

import axiosInstance from '../../../lib/axios';
import type { PoseFrame } from '../types/pose-sequence.types';
import type {
  CaregiverNotification,
  FallEventRecord,
  InferencePredictionResponse,
} from '../types/fall-detection.types';

export interface CreateFallEventPayload {
  patient_id?: string;
  fall_score: number;
  severity?: 'low' | 'medium' | 'high';
  model_version?: string;
  window?: {
    start_ms?: number | null;
    end_ms?: number | null;
  };
  detected_at?: string;
  description?: string;
}

export const fallDetectionApi = {
  /**
   * Submit a temporal window of pose frames for ML fall classification.
   */
  async predictWindow(frames: PoseFrame[]): Promise<InferencePredictionResponse> {
    const compactFrames = frames.map((f) => ({
      timestampMs: f.timestampMs,
      frameIndex: f.frameIndex,
      landmarks: f.landmarks.map((l) => ({
        x: Math.round(l.x * 10000) / 10000,
        y: Math.round(l.y * 10000) / 10000,
        z: l.z !== undefined ? Math.round(l.z * 10000) / 10000 : undefined,
        visibility: l.visibility !== undefined ? Math.round(l.visibility * 1000) / 1000 : undefined,
      })),
      quality: f.quality,
    }));

    const res = await axiosInstance.post<InferencePredictionResponse>(
      '/fall-detection/predict',
      {
        schema_version: '1.0.0',
        frames: compactFrames,
      }
    );
    return res.data;
  },

  /**
   * Create and persist a confirmed fall event.
   */
  async createEvent(payload: CreateFallEventPayload): Promise<{ event: FallEventRecord; duplicate: boolean }> {
    const res = await axiosInstance.post<{ event: FallEventRecord; duplicate: boolean }>(
      '/fall-detection/events',
      payload
    );
    return res.data;
  },

  /**
   * Fetch authenticated patient's own fall events.
   */
  async getMyEvents(): Promise<FallEventRecord[]> {
    const res = await axiosInstance.get<{ events: FallEventRecord[] }>('/fall-detection/events/mine');
    return res.data.events;
  },

  /**
   * Fetch fall events for linked elderly patients (Caregiver view).
   */
  async getCaregiverEvents(): Promise<FallEventRecord[]> {
    const res = await axiosInstance.get<{ events: FallEventRecord[] }>('/fall-detection/events/caregiver');
    return res.data.events;
  },

  /**
   * Fetch a single fall event by ID.
   */
  async getEventById(id: string): Promise<FallEventRecord> {
    const res = await axiosInstance.get<{ event: FallEventRecord }>(`/fall-detection/events/${id}`);
    return res.data.event;
  },

  /**
   * Acknowledge an active fall event.
   */
  async acknowledgeEvent(id: string): Promise<FallEventRecord> {
    const res = await axiosInstance.patch<{ event: FallEventRecord }>(
      `/fall-detection/events/${id}/acknowledge`
    );
    return res.data.event;
  },

  /**
   * Resolve a fall event.
   */
  async resolveEvent(id: string): Promise<FallEventRecord> {
    const res = await axiosInstance.patch<{ event: FallEventRecord }>(
      `/fall-detection/events/${id}/resolve`
    );
    return res.data.event;
  },

  /**
   * Mark a fall event as a false alarm / user-cancelled incident.
   */
  async markFalseAlarm(id: string): Promise<FallEventRecord> {
    const res = await axiosInstance.patch<{ event: FallEventRecord }>(
      `/fall-detection/events/${id}/false-alarm`
    );
    return res.data.event;
  },

  /**
   * Fetch in-app notifications for the authenticated user.
   */
  async getNotifications(): Promise<CaregiverNotification[]> {
    const res = await axiosInstance.get<{ notifications: CaregiverNotification[] }>(
      '/fall-detection/notifications'
    );
    return res.data.notifications;
  },

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(id: string): Promise<CaregiverNotification> {
    const res = await axiosInstance.patch<{ notification: CaregiverNotification }>(
      `/fall-detection/notifications/${id}/read`
    );
    return res.data.notification;
  },
};
