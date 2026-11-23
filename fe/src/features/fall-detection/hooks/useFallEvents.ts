/**
 * Hook for fetching and managing fall events and caregiver notifications.
 */

import { useState, useEffect, useCallback } from 'react';
import { fallDetectionApi } from '../services/fallDetectionApi';
import type { CaregiverNotification, FallEventRecord } from '../types/fall-detection.types';

export function useFallEvents(isCaregiver: boolean = false) {
  const [events, setEvents] = useState<FallEventRecord[]>([]);
  const [notifications, setNotifications] = useState<CaregiverNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isCaregiver) {
        const [cEvents, notifs] = await Promise.all([
          fallDetectionApi.getCaregiverEvents(),
          fallDetectionApi.getNotifications(),
        ]);
        setEvents(cEvents);
        setNotifications(notifs);
      } else {
        const pEvents = await fallDetectionApi.getMyEvents();
        setEvents(pEvents);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load fall events';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isCaregiver]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const acknowledge = useCallback(
    async (id: string) => {
      try {
        const updated = await fallDetectionApi.acknowledgeEvent(id);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to acknowledge event';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const resolve = useCallback(
    async (id: string) => {
      try {
        const updated = await fallDetectionApi.resolveEvent(id);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to resolve event';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const updated = await fallDetectionApi.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }, []);

  const unreadNotificationCount = notifications.filter((n) => n.status === 'unread').length;
  const unresolvedEventCount = events.filter((e) => ['awaiting_response', 'suspected', 'acknowledged'].includes(e.status)).length;

  return {
    events,
    notifications,
    isLoading,
    error,
    unreadNotificationCount,
    unresolvedEventCount,
    refresh: fetchEvents,
    acknowledge,
    resolve,
    markNotificationAsRead,
  };
}
