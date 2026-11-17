import React from 'react';
import {
  Play,
  Square,
  Activity,
  FlipHorizontal,
  Info,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import type {
  CameraStatus,
  ModelStatus,
  PosePresenceStatus,
  PoseStats,
} from '../types/pose.types';

interface PoseStatusPanelProps {
  cameraStatus: CameraStatus;
  modelStatus: ModelStatus;
  poseStatus: PosePresenceStatus;
  stats: PoseStats;
  isMirrored: boolean;
  delegateInUse: 'GPU' | 'CPU' | null;
  videoResolution?: { width: number; height: number } | null;
  onStart: () => void;
  onStop: () => void;
  onToggleMirror: () => void;
  onRetry: () => void;
}

export const PoseStatusPanel: React.FC<PoseStatusPanelProps> = ({
  cameraStatus,
  modelStatus,
  poseStatus,
  stats,
  isMirrored,
  delegateInUse,
  videoResolution,
  onStart,
  onStop,
  onToggleMirror,
  onRetry,
}) => {
  const isRunning = cameraStatus === 'ready';
  const isBusy = cameraStatus === 'requesting' || modelStatus === 'loading';

  // Camera status badge formatting
  const getCameraBadge = () => {
    switch (cameraStatus) {
      case 'ready':
        return {
          label: 'Camera Active',
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'requesting':
        return {
          label: 'Requesting Access...',
          color: 'bg-amber-500/10 text-amber-600 border-amber-200',
          dot: 'bg-amber-500 animate-ping',
        };
      case 'error':
        return {
          label: 'Camera Error',
          color: 'bg-rose-500/10 text-rose-600 border-rose-200',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: 'Camera Off',
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          dot: 'bg-gray-400',
        };
    }
  };

  // Model status badge formatting
  const getModelBadge = () => {
    switch (modelStatus) {
      case 'ready':
        return {
          label: `Model Ready (${delegateInUse ?? 'GPU'})`,
          color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
        };
      case 'loading':
        return {
          label: 'Loading Pose Model...',
          color: 'bg-amber-500/10 text-amber-600 border-amber-200',
        };
      case 'error':
        return {
          label: 'Model Error',
          color: 'bg-rose-500/10 text-rose-600 border-rose-200',
        };
      default:
        return {
          label: 'Model Idle',
          color: 'bg-gray-100 text-gray-500 border-gray-200',
        };
    }
  };

  // Pose detection status text
  const getPoseDetectionText = () => {
    if (cameraStatus !== 'ready') return 'Camera inactive';
    if (modelStatus === 'loading') return 'Initializing MediaPipe Pose Landmarker...';
    if (poseStatus === 'pose-detected') return 'Pose detected';
    if (poseStatus === 'looking-for-person') return 'Looking for a person in frame...';
    return 'Waiting for video stream...';
  };

  const cameraBadge = getCameraBadge();
  const modelBadge = getModelBadge();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      {/* Controls & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={isBusy}
              className="px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onStop}
              className="px-6 py-3 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Camera</span>
            </button>
          )}

          {cameraStatus === 'error' && (
            <button
              onClick={onRetry}
              className="px-4 py-3 rounded-xl font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
        </div>

        {/* Video preview controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMirror}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${isMirrored
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            title="Mirror preview (selfie mode)"
          >
            <FlipHorizontal className="w-4 h-4" />
            <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
          </button>
        </div>
      </div>

      {/* Status Badges & Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Camera Status */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Camera Status
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraBadge.dot}`} />
            <span className="font-medium text-sm text-gray-800">
              {cameraBadge.label}
            </span>
          </div>
          {videoResolution && videoResolution.width > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {videoResolution.width} &times; {videoResolution.height}
            </div>
          )}
        </div>

        {/* Pose Model */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            MediaPipe Runtime
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span className="font-medium text-sm text-gray-800">
              {modelBadge.label}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            tasks-vision Pose Landmarker
          </div>
        </div>

        {/* Live Detection State */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Pose Tracking
          </div>
          <div className="flex items-center gap-2">
            {poseStatus === 'pose-detected' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : poseStatus === 'looking-for-person' ? (
              <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            )}
            <span className="font-medium text-sm text-gray-800">
              {getPoseDetectionText()}
            </span>
          </div>
          {isRunning && (
            <div className="text-xs text-gray-400 mt-1">
              {stats.poseCount > 0
                ? `${stats.poseCount} person tracked`
                : 'No person in frame'}
            </div>
          )}
        </div>

        {/* Inference Performance */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Frame Rate
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">
              {isRunning && stats.fps > 0 ? stats.fps : '0'}
            </span>
            <span className="text-xs text-gray-500">FPS</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {isRunning && stats.lastInferenceTimeMs > 0
              ? `${stats.lastInferenceTimeMs.toFixed(1)} ms / frame`
              : 'Idle'}
          </div>
        </div>
      </div>

      {/* Non-clinical Milestone Disclaimer */}
      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <span className="font-semibold text-indigo-900 block mb-0.5">
            Milestone A – Live Pose Tracking Demo
          </span>
          This page demonstrates live browser-based pose landmark detection using
          Google MediaPipe. It visualizes the body skeleton in real time for research
          and testing. It does <strong>not</strong> classify falls, predict risk,
          or trigger emergency alerts.
        </div>
      </div>
    </div>
  );
};
