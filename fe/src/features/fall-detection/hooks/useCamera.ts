import { useState, useRef, useCallback, useEffect } from 'react';
import type { CameraStatus, CameraError, CameraErrorType } from '../types/pose.types';

export interface UseCameraResult {
  stream: MediaStream | null;
  cameraStatus: CameraStatus;
  cameraError: CameraError | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => Promise<MediaStream | null>;
  stopCamera: () => void;
  restartCamera: () => Promise<MediaStream | null>;
}

export function useCamera(): UseCameraResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<CameraError | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef<boolean>(false);

  const parseCameraError = (err: unknown): CameraError => {
    const errorObj = err as { name?: string; message?: string };
    const name = errorObj?.name || '';
    const rawMessage = errorObj?.message || String(err);

    let type: CameraErrorType = 'unknown';
    let message = 'An unexpected camera error occurred. Please try again.';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      type = 'permission-denied';
      message =
        'Camera permission was denied. Please allow camera access in your browser address bar or system settings, then click Start Camera again.';
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      type = 'not-found';
      message = 'No video camera device was found on this system.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      type = 'in-use';
      message =
        'The camera is currently unavailable. It may be in use by another tab or desktop application.';
    } else if (name === 'SecurityError') {
      type = 'secure-context-required';
      message =
        'Camera access requires a secure context (HTTPS or localhost). Please access the app via HTTPS or http://localhost.';
    } else if (name === 'NotSupportedError') {
      type = 'not-supported';
      message = 'Your browser does not support camera access via getUserMedia.';
    }

    return { type, message, details: rawMessage };
  };

  const stopCamera = useCallback(() => {
    isStartingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setCameraStatus('idle');
  }, []);

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (isStartingRef.current) {
      return streamRef.current;
    }

    // Stop any existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isSecure = window.isSecureContext;
      const error: CameraError = {
        type: isSecure ? 'not-supported' : 'secure-context-required',
        message: isSecure
          ? 'navigator.mediaDevices.getUserMedia is not supported by your browser.'
          : 'Camera access requires a secure context (HTTPS or localhost). Please load this page over HTTPS.',
      };
      setCameraError(error);
      setCameraStatus('error');
      return null;
    }

    isStartingRef.current = true;
    setCameraStatus('requesting');
    setCameraError(null);

    let mediaStream: MediaStream | null = null;

    try {
      try {
        // Preferred 720p constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false, // Strict: no audio requested
        });
      } catch (constraintErr: unknown) {
        const errorObj = constraintErr as { name?: string };
        // Fallback to basic video constraints if overconstrained
        if (errorObj?.name === 'OverconstrainedError') {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      // Attach to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setCameraStatus('ready');
      return mediaStream;
    } catch (err: unknown) {
      const parsedError = parseCameraError(err);
      setCameraError(parsedError);
      setCameraStatus('error');
      return null;
    } finally {
      isStartingRef.current = false;
    }
  }, []);

  const restartCamera = useCallback(async (): Promise<MediaStream | null> => {
    stopCamera();
    return await startCamera();
  }, [stopCamera, startCamera]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    cameraStatus,
    cameraError,
    videoRef,
    startCamera,
    stopCamera,
    restartCamera,
  };
}
