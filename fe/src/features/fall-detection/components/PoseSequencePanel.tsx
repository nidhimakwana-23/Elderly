import React, { useState } from 'react';
import {
  CircleDot,
  Square,
  Trash2,
  Download,
  Database,
  ShieldCheck,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { BufferStats, CaptureState } from '../types/pose-sequence.types';
import type { ExportResult } from '../utils/poseExporter';

interface PoseSequencePanelProps {
  captureState: CaptureState;
  bufferStats: BufferStats;
  isCameraReady: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onClearCapture: () => void;
  onExport: (notes?: string) => ExportResult;
}

export const PoseSequencePanel: React.FC<PoseSequencePanelProps> = ({
  captureState,
  bufferStats,
  isCameraReady,
  onStartCapture,
  onStopCapture,
  onClearCapture,
  onExport,
}) => {
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const isRecording = captureState === 'recording';
  const hasFrames = bufferStats.frameCount > 0;

  const handleExportConfirm = () => {
    const result = onExport(customNotes.trim() ? customNotes.trim() : undefined);
    if (result.success) {
      setExportFeedback(`Exported: ${result.filename} (${Math.round((result.byteSize ?? 0) / 1024)} KB)`);
      setTimeout(() => {
        setExportFeedback(null);
        setShowExportModal(false);
      }, 2500);
    } else {
      setExportFeedback(result.error ?? 'Export failed');
    }
  };

  // Format retained seconds
  const retainedSec = (bufferStats.retainedDurationMs / 1000).toFixed(1);
  const maxSec = (bufferStats.maxDurationMs / 1000).toFixed(0);
  const capacityPercent = Math.round(bufferStats.capacityUtilizationRatio * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Sequence Capture & Buffer
            </h3>
            <p className="text-xs text-gray-500">
              In-memory rolling buffer (Milestone B)
            </p>
          </div>
        </div>

        {/* Capture State Indicator Badge */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              Recording
            </span>
          ) : captureState === 'stopped' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Buffer Frozen
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Idle
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            onClick={onStartCapture}
            disabled={!isCameraReady}
            className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <CircleDot className="w-4 h-4 fill-current text-rose-300" />
            <span>{captureState === 'stopped' ? 'Resume Capture' : 'Start Capture'}</span>
          </button>
        ) : (
          <button
            onClick={onStopCapture}
            className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Capture</span>
          </button>
        )}

        <button
          onClick={onClearCapture}
          disabled={!hasFrames || isRecording}
          className="px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          title="Clear sequence buffer"
        >
          <Trash2 className="w-4 h-4 text-gray-500" />
          <span>Clear</span>
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          disabled={!hasFrames}
          className="px-4 py-2.5 rounded-xl font-medium text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
          title="Export captured sequence snapshot as JSON"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Buffer Progress & Utilization */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-600 font-medium">
          <span>Buffer Capacity</span>
          <span>
            {bufferStats.frameCount} / {bufferStats.maxFrameCapacity} frames ({capacityPercent}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              capacityPercent >= 90
                ? 'bg-amber-500'
                : isRecording
                ? 'bg-indigo-600'
                : 'bg-indigo-400'
            }`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      {/* Diagnostic Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Retained Duration */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Duration</span>
          </div>
          <div className="text-lg font-bold text-gray-800">
            {retainedSec}s
          </div>
          <div className="text-[11px] text-gray-400">max {maxSec}s</div>
        </div>

        {/* Frames & Cadence */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Cadence</span>
          </div>
          <div className="text-lg font-bold text-gray-800">
            {bufferStats.averageFps > 0 ? `${bufferStats.averageFps}` : '—'}
          </div>
          <div className="text-[11px] text-gray-400">avg FPS</div>
        </div>

        {/* Mean Visibility */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visibility</span>
          </div>
          <div className="text-lg font-bold text-gray-800">
            {bufferStats.meanVisibility > 0
              ? `${Math.round(bufferStats.meanVisibility * 100)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-gray-400">landmark confidence</div>
        </div>

        {/* Dropped / Evicted */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Evicted</span>
          </div>
          <div className="text-lg font-bold text-gray-800">
            {bufferStats.droppedFrameCount}
          </div>
          <div className="text-[11px] text-gray-400">FIFO discarded</div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-emerald-950">Privacy Protected:</strong>
          {' '}Pose sequences are stored strictly in browser memory. No camera video or audio is ever recorded, stored on disk, or transmitted to any cloud backend.
        </div>
      </div>

      {/* Explicit Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                <h4 className="text-lg font-semibold text-gray-900">
                  Export Pose Sequence (JSON)
                </h4>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              You are about to export a timestamped 3D skeleton sequence containing{' '}
              <strong>{bufferStats.frameCount} frames</strong> ({retainedSec} seconds) for research, debugging, or dataset preparation (Milestone C).
            </p>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
              <div className="font-semibold text-gray-800">Included Data:</div>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                <li>Schema version 1.0.0 & capture UUID</li>
                <li>Monotonic timestamps (ms) & frame indices</li>
                <li>33 normalized MediaPipe landmarks (x, y, z, visibility)</li>
                <li>Quality scores & frame rates</li>
                <li><strong>No raw video or audio files</strong></li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Movement notes or activity label (optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Normal walking, sitting on chair, stumble recovery"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {exportFeedback && (
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                {exportFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportConfirm}
                className="px-5 py-2 text-sm rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Confirm & Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
