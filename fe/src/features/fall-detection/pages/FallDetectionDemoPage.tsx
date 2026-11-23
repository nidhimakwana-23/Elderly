import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraPreview } from '../components/CameraPreview';
import { PoseOverlay } from '../components/PoseOverlay';
import { PoseStatusPanel } from '../components/PoseStatusPanel';
import { PoseSequencePanel } from '../components/PoseSequencePanel';
import { FallDetectionStatus } from '../components/FallDetectionStatus';
import { FallConfirmationDialog } from '../components/FallConfirmationDialog';
import { useCamera } from '../hooks/useCamera';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { usePoseSequenceCapture } from '../hooks/usePoseSequenceCapture';
import { useFallDetection } from '../hooks/useFallDetection';
import { useFallConfirmation } from '../hooks/useFallConfirmation';
import { clearCanvas, drawPose } from '../utils/poseDrawing';
import { serializePoseResult } from '../utils/poseSerializer';
import { EXPECTED_LANDMARK_COUNT, type PoseFrame } from '../types/pose-sequence.types';
import type { PosePresenceStatus, PoseStats } from '../types/pose.types';
import { History } from 'lucide-react';

interface FallDetectionDemoPageProps {
  onNavigateToHistory?: () => void;
}

export const FallDetectionDemoPage: React.FC<FallDetectionDemoPageProps> = ({
  onNavigateToHistory,
}) => {
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
  const liveFrameIndexRef = useRef<number>(0);

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

  const {
    captureState,
    bufferStats,
    startCapture,
    stopCapture,
    clearCapture,
    exportSequence,
    ingestInferenceResult,
  } = usePoseSequenceCapture();

  // Confirmation hook
  const {
    isOpen: isConfirmOpen,
    secondsRemaining,
    activeFallScore,
    isSubmitting: isConfirmSubmitting,
    triggerConfirmation,
    handleImOkay,
    handleNeedHelp,
  } = useFallConfirmation({
    onAlertDispatched: () => {
      engine.enterCooldown();
      setMonitoringState('alert_sent');
    },
    onCancelled: () => {
      engine.enterCooldown();
      setMonitoringState('cooldown');
    },
  });

  // Real-time ML Fall Detection hook
  const {
    monitoringState,
    stats: inferenceStats,
    engine,
    startMonitoring,
    stopMonitoring,
    ingestPoseFrame,
    setMonitoringState,
  } = useFallDetection({
    onPotentialFallDetected: (score, windowInfo) => {
      triggerConfirmation(score, windowInfo);
    },
  });

  const ingestPoseFrameRef = useRef(ingestPoseFrame);
  ingestPoseFrameRef.current = ingestPoseFrame;

  // Ref to access ingestInferenceResult without re-binding the inference loop
  const ingestRef = useRef(ingestInferenceResult);
  ingestRef.current = ingestInferenceResult;

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

          // Milestone B: Ingest result into manual sequence capture buffer
          ingestRef.current(result, timestampMs);

          // Milestone D: Ingest into continuous real-time fall detection pipeline
          const frameIndex = liveFrameIndexRef.current++;
          const serialized = serializePoseResult(result, timestampMs, frameIndex);
          const livePoseFrame: PoseFrame = serialized || {
            timestampMs: Math.round(timestampMs),
            frameIndex,
            landmarks: Array.from({ length: EXPECTED_LANDMARK_COUNT }, () => ({
              x: 0,
              y: 0,
              z: 0,
              visibility: 0,
            })),
            quality: {
              poseDetected: false,
              validLandmarkCount: 0,
              expectedLandmarkCount: EXPECTED_LANDMARK_COUNT,
            },
          };
          ingestPoseFrameRef.current(livePoseFrame);

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

    // 3. Start monitoring & inference loop
    startMonitoring();
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
  }, [startCamera, initModel, startMonitoring, videoRef, runInferenceLoop]);

  // Master Stop handler: stops camera, sequence capture, and fall monitoring
  const handleStop = useCallback(() => {
    stopLoop();
    stopCamera();
    stopCapture();
    stopMonitoring();
    setPoseStatus('idle');
    setStats({
      fps: 0,
      poseCount: 0,
      lastInferenceTimeMs: 0,
    });
    setVideoResolution(null);
  }, [stopLoop, stopCamera, stopCapture, stopMonitoring]);

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
      stopMonitoring();
    };
  }, [stopLoop, stopCamera, closeLandmarker, stopMonitoring]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Fall Confirmation Modal Dialog */}
      <FallConfirmationDialog
        isOpen={isConfirmOpen}
        secondsRemaining={secondsRemaining}
        fallScore={activeFallScore}
        isSubmitting={isConfirmSubmitting}
        onImOkay={handleImOkay}
        onNeedHelp={handleNeedHelp}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              Milestone D
            </span>
            <span className="text-xs text-gray-500">Real-Time Inference & Confirmation Workflow</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Fall Detection & Safety Monitoring
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time ML fall detection evaluates rolling 2.5-second windows of body landmarks against the trained classifier.
            Confirmed patterns trigger elderly response confirmation and immediate caregiver alerts.
          </p>
        </div>

        {onNavigateToHistory && (
          <button
            onClick={onNavigateToHistory}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Incident History</span>
          </button>
        )}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Preview & Canvas Overlay */}
        <div className="lg:col-span-7 space-y-4">
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

        {/* Right Column: Status, Controls & Fall Monitoring Panels */}
        <div className="lg:col-span-5 space-y-6">
          {/* Milestone D: Real-Time Fall Inference Status Panel */}
          <FallDetectionStatus
            state={monitoringState}
            stats={inferenceStats}
          />

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

          {/* Milestone B: Offline Sequence Export Panel */}
          <PoseSequencePanel
            captureState={captureState}
            bufferStats={bufferStats}
            isCameraReady={cameraStatus === 'ready'}
            onStartCapture={startCapture}
            onStopCapture={stopCapture}
            onClearCapture={clearCapture}
            onExport={exportSequence}
          />
        </div>
      </div>
    </div>
  );
};
