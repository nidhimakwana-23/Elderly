import { useState, useRef, useCallback, useEffect } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { ModelStatus, PoseLandmarkerConfig } from '../types/pose.types';

const DEFAULT_LOCAL_WASM = '/wasm';
const CDN_FALLBACK_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';

const DEFAULT_LOCAL_MODEL = '/models/pose_landmarker_lite.task';
const CDN_FALLBACK_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export interface UsePoseLandmarkerResult {
  modelStatus: ModelStatus;
  modelError: string | null;
  delegateInUse: 'GPU' | 'CPU' | null;
  landmarkerRef: React.MutableRefObject<PoseLandmarker | null>;
  initModel: () => Promise<PoseLandmarker | null>;
  close: () => void;
}

export function usePoseLandmarker(
  config?: PoseLandmarkerConfig,
): UsePoseLandmarkerResult {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('uninitialized');
  const [modelError, setModelError] = useState<string | null>(null);
  const [delegateInUse, setDelegateInUse] = useState<'GPU' | 'CPU' | null>(null);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const initPromiseRef = useRef<Promise<PoseLandmarker | null> | null>(null);

  const close = useCallback(() => {
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch {
        // ignore
      }
      landmarkerRef.current = null;
    }
    setModelStatus('uninitialized');
    setDelegateInUse(null);
  }, []);

  const createLandmarker = useCallback(
    async (
      wasmPath: string,
      modelPath: string,
      delegate: 'GPU' | 'CPU',
    ): Promise<PoseLandmarker> => {
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate,
        },
        runningMode: 'VIDEO',
        numPoses: config?.numPoses ?? 1,
        minPoseDetectionConfidence: config?.minPoseDetectionConfidence ?? 0.5,
        minPosePresenceConfidence: config?.minPosePresenceConfidence ?? 0.5,
        minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
      });
    },
    [config],
  );

  const initModel = useCallback(async (): Promise<PoseLandmarker | null> => {
    // If already ready, return existing instance
    if (landmarkerRef.current) {
      return landmarkerRef.current;
    }

    // If currently initializing, return the active promise
    if (initPromiseRef.current) {
      return await initPromiseRef.current;
    }

    const runInit = async (): Promise<PoseLandmarker | null> => {
      setModelStatus('loading');
      setModelError(null);

      const targetWasm = config?.wasmBasePath ?? DEFAULT_LOCAL_WASM;
      const targetModel = config?.modelAssetPath ?? DEFAULT_LOCAL_MODEL;
      const preferredDelegate = config?.delegate ?? 'GPU';

      // Attempt 1: Preferred configuration (local assets + preferred delegate)
      try {
        const instance = await createLandmarker(
          targetWasm,
          targetModel,
          preferredDelegate,
        );
        landmarkerRef.current = instance;
        setDelegateInUse(preferredDelegate);
        setModelStatus('ready');
        return instance;
      } catch (err1) {
        console.warn(
          `PoseLandmarker init with ${preferredDelegate} failed, trying CPU fallback...`,
          err1,
        );

        // Attempt 2: Fallback to CPU delegate if GPU failed
        if (preferredDelegate === 'GPU') {
          try {
            const instance = await createLandmarker(targetWasm, targetModel, 'CPU');
            landmarkerRef.current = instance;
            setDelegateInUse('CPU');
            setModelStatus('ready');
            return instance;
          } catch (err2) {
            console.warn('PoseLandmarker init with CPU on local assets failed...', err2);
          }
        }

        // Attempt 3: Fallback to CDN assets if local assets failed
        try {
          console.info('Attempting fallback to MediaPipe CDN assets...');
          const instance = await createLandmarker(
            CDN_FALLBACK_WASM,
            CDN_FALLBACK_MODEL,
            'CPU',
          );
          landmarkerRef.current = instance;
          setDelegateInUse('CPU');
          setModelStatus('ready');
          return instance;
        } catch (err3: unknown) {
          const message =
            err3 instanceof Error
              ? err3.message
              : 'Failed to load MediaPipe Pose Landmarker model.';
          console.error('All PoseLandmarker initialization attempts failed:', err3);
          setModelError(
            `Failed to load pose detection model: ${message}. Please check your network connection or reload.`,
          );
          setModelStatus('error');
          return null;
        }
      } finally {
        initPromiseRef.current = null;
      }
    };

    const promise = runInit();
    initPromiseRef.current = promise;
    return await promise;
  }, [config, createLandmarker]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // ignore
        }
        landmarkerRef.current = null;
      }
    };
  }, []);

  return {
    modelStatus,
    modelError,
    delegateInUse,
    landmarkerRef,
    initModel,
    close,
  };
}
