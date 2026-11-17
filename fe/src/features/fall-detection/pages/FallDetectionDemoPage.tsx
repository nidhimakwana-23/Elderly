import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraPreview } from '../components/CameraPreview';
import { PoseOverlay } from '../components/PoseOverlay';
import { PoseStatusPanel } from '../components/PoseStatusPanel';
import { useCamera } from '../hooks/useCamera';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { clearCanvas, drawPose } from '../utils/poseDrawing';
import type { PosePresenceStatus, PoseStats } from '../types/pose.types';

export const FallDetectionDemoPage: React.FC = () => {
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [poseStatus, setPoseStatus] = useState<PosePresenceStatus>('idle');
  const [stats, setStats] = useState<PoseStats>({
    fps: 0,
    poseCount: 0,
    lastInferenceTimeMs: 0,
  });
  const [videoResolution, setVideoResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLoopActiveRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastTimestampMsRef = useRef<number>(0);

  // Throttled stats tracking
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);
  const lastInferenceDurationRef = useRef<number>(0);

  const {
    cameraStatus,
    cameraError,
    videoRef,
    startCamera,
    stopCamera,
  } = useCamera();

  const {
    modelStatus,
    delegateInUse,
    landmarkerRef,
    initModel,
    close: closeLandmarker,
  } = usePoseLandmarker();

  // Stop the frame inference loop
  const stopLoop = useCallback(() => {
    isLoopActiveRef.current = false;
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    isProcessingRef.current = false;

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        clearCanvas(ctx, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  // Frame processing loop
  const runInferenceLoop = useCallback(() => {
    if (!isLoopActiveRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) {
      animationFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
      return;
    }

    // Video must have valid frame data and non-zero dimensions
    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      // Sync canvas dimensions
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setVideoResolution({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }

      // Avoid overlapping inferences
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;

        const startTime = performance.now();

        // Monotonically increasing timestamp requirement from MediaPipe
        let timestampMs = performance.now();
        if (timestampMs <= lastTimestampMsRef.current) {
          timestampMs = lastTimestampMsRef.current + 1;
        }
        lastTimestampMsRef.current = timestampMs;

        try {
          const result = landmarker.detectForVideo(video, timestampMs);
          const endTime = performance.now();
          lastInferenceDurationRef.current = endTime - startTime;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            clearCanvas(ctx, canvas.width, canvas.height);

            const hasPose = result.landmarks && result.landmarks.length > 0;
            if (hasPose) {
              drawPose(ctx, result.landmarks[0]);
            }

            // Stats calculation every 400ms to avoid high-frequency React re-renders
            frameCountRef.current++;
            const now = performance.now();
            if (now - lastFpsTimeRef.current >= 400) {
              const elapsedSec = (now - lastFpsTimeRef.current) / 1000;
              const calculatedFps = Math.round(frameCountRef.current / elapsedSec);
              frameCountRef.current = 0;
              lastFpsTimeRef.current = now;

              setStats({
                fps: calculatedFps,
                poseCount: hasPose ? 1 : 0,
                lastInferenceTimeMs: lastInferenceDurationRef.current,
              });

              setPoseStatus(hasPose ? 'pose-detected' : 'looking-for-person');
            }
          }
        } catch (inferErr) {
          console.error('Pose inference error:', inferErr);
        } finally {
          isProcessingRef.current = false;
        }
      }
    }

    if (isLoopActiveRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
    }
  }, [videoRef, landmarkerRef]);

  // Master Start handler
  const handleStart = useCallback(async () => {
    setPoseStatus('requesting-camera');

    // 1. Request camera
    const stream = await startCamera();
    if (!stream) {
      setPoseStatus('error');
      return;
    }

    // 2. Initialize MediaPipe model
    setPoseStatus('loading-model');
    const landmarker = await initModel();
    if (!landmarker) {
      setPoseStatus('error');
      return;
    }

    // 3. Start inference loop
    isLoopActiveRef.current = true;
    lastFpsTimeRef.current = performance.now();
    frameCountRef.current = 0;
    setPoseStatus('looking-for-person');

    // Wait for video metadata if not yet loaded
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoResolution({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    }

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    animationFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
  }, [startCamera, initModel, videoRef, runInferenceLoop]);

  // Master Stop handler
  const handleStop = useCallback(() => {
    stopLoop();
    stopCamera();
    setPoseStatus('idle');
    setStats({
      fps: 0,
      poseCount: 0,
      lastInferenceTimeMs: 0,
    });
    setVideoResolution(null);
  }, [stopLoop, stopCamera]);

  // Retry handler
  const handleRetry = useCallback(async () => {
    handleStop();
    await handleStart();
  }, [handleStop, handleStart]);

  // Toggle horizontal mirror
  const handleToggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      stopCamera();
      closeLandmarker();
    };
  }, [stopLoop, stopCamera, closeLandmarker]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Milestone A
          </span>
          <span className="text-xs text-gray-500">Live Pose Landmark Visualization</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Fall Detection – Pose Tracking Demo
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Real-time body landmark detection using Google MediaPipe Pose Landmarker for Web.
          This milestone visualizes the skeleton overlay to verify live tracking before ML fall classification.
        </p>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Preview & Canvas Overlay */}
        <div className="lg:col-span-8 space-y-4">
          <CameraPreview
            videoRef={videoRef}
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            isMirrored={isMirrored}
          >
            <PoseOverlay
              canvasRef={canvasRef}
              videoRef={videoRef}
              isMirrored={isMirrored}
            />
          </CameraPreview>
        </div>

        {/* Right Column: Status & Controls Panel */}
        <div className="lg:col-span-4">
          <PoseStatusPanel
            cameraStatus={cameraStatus}
            modelStatus={modelStatus}
            poseStatus={poseStatus}
            stats={stats}
            isMirrored={isMirrored}
            delegateInUse={delegateInUse}
            videoResolution={videoResolution}
            onStart={handleStart}
            onStop={handleStop}
            onToggleMirror={handleToggleMirror}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
};
