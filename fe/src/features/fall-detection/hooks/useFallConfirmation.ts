/**
 * Hook for managing the elderly user fall confirmation workflow,
 * including visual warning, audible alert, and escalation timer.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { fallDetectionApi } from '../services/fallDetectionApi';
import type { FallEventRecord } from '../types/fall-detection.types';

interface UseFallConfirmationProps {
  onAlertDispatched?: (event: FallEventRecord) => void;
  onCancelled?: () => void;
  countdownDurationSeconds?: number;
}

export function useFallConfirmation({
  onAlertDispatched,
  onCancelled,
  countdownDurationSeconds = 15,
}: UseFallConfirmationProps = {}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(countdownDurationSeconds);
  const [activeFallScore, setActiveFallScore] = useState<number>(0);
  const [activeEvent, setActiveEvent] = useState<FallEventRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<number | null>(null);

  // Sound generator using Web Audio API
  const playAlertChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy may block without user gesture; silently ignore
    }
  }, []);

  const stopSound = useCallback(() => {
    if (soundIntervalRef.current !== null) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const triggerConfirmation = useCallback(
    async (fallScore: number, windowInfo: { start_ms: number | null; end_ms: number | null }) => {
      setActiveFallScore(fallScore);
      setSecondsRemaining(countdownDurationSeconds);
      setIsOpen(true);

      // Start periodic alert chime (every 1.5 seconds)
      playAlertChime();
      soundIntervalRef.current = window.setInterval(playAlertChime, 1500);

      // Pre-create the fall event in backend with awaiting_response status
      try {
        const { event } = await fallDetectionApi.createEvent({
          fall_score: fallScore,
          severity: fallScore > 0.8 ? 'high' : 'medium',
          window: windowInfo,
          description: `Automatic fall detection candidate (score: ${(fallScore * 100).toFixed(0)}%)`,
        });
        setActiveEvent(event);
      } catch (err) {
        console.error('Failed to create initial fall event:', err);
      }
    },
    [countdownDurationSeconds, playAlertChime]
  );

  const handleImOkay = useCallback(async () => {
    stopSound();
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSubmitting(true);

    try {
      if (activeEvent?.id) {
        await fallDetectionApi.markFalseAlarm(activeEvent.id);
      }
    } catch (err) {
      console.warn('Failed to mark event as false alarm:', err);
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
      setActiveEvent(null);
      onCancelled?.();
    }
  }, [activeEvent, onCancelled, stopSound]);

  const handleNeedHelp = useCallback(async () => {
    stopSound();
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSubmitting(true);

    try {
      let event = activeEvent;
      if (!event) {
        const res = await fallDetectionApi.createEvent({
          fall_score: activeFallScore || 0.9,
          severity: 'high',
          description: 'Emergency assistance requested by elderly user.',
        });
        event = res.event;
      }
      onAlertDispatched?.(event);
    } catch (err) {
      console.error('Failed to dispatch emergency alert:', err);
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
      setActiveEvent(null);
    }
  }, [activeEvent, activeFallScore, onAlertDispatched, stopSound]);

  // Handle countdown interval
  useEffect(() => {
    if (!isOpen) return;

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timeout expired: automatically request help / escalate
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleNeedHelp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, handleNeedHelp]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, [stopSound]);

  return {
    isOpen,
    secondsRemaining,
    activeFallScore,
    activeEvent,
    isSubmitting,
    triggerConfirmation,
    handleImOkay,
    handleNeedHelp,
  };
}
