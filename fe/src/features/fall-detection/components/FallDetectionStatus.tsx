import React from 'react';
import { Activity, ShieldCheck, Cpu, Clock, AlertCircle } from 'lucide-react';
import type { FallMonitoringState, InferenceStats } from '../types/fall-detection.types';

interface FallDetectionStatusProps {
  state: FallMonitoringState;
  stats: InferenceStats;
}

export const FallDetectionStatus: React.FC<FallDetectionStatusProps> = ({ state, stats }) => {
  const scorePercent = Math.min(100, Math.round(stats.lastScore * 100));

  const getStateBadge = () => {
    switch (state) {
      case 'idle':
        return { label: 'Idle', color: 'bg-gray-100 text-gray-700 border-gray-200' };
      case 'monitoring':
        return { label: 'Monitoring Active', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'candidate':
        return { label: 'Potential Pattern', color: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' };
      case 'suspected_fall':
        return { label: 'Fall Suspected', color: 'bg-red-100 text-red-800 border-red-300 animate-bounce' };
      case 'awaiting_response':
        return { label: 'Awaiting User Response', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'alert_sent':
        return { label: 'Caregiver Alert Sent', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'cooldown':
        return { label: 'Incident Cooldown', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: state, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const badge = getStateBadge();

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800 text-sm">Real-Time ML Fall Monitoring</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Fall Score Meter */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
          <span className="font-medium">Fall Risk Probability</span>
          <span className="font-bold font-mono">
            {scorePercent}% (Threshold: 10%)
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200">
          {/* Threshold marker at 10% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
            style={{ left: '10%' }}
            title="Decision Threshold (0.1)"
          />
          <div
            className={`h-full transition-all duration-300 ${
              scorePercent >= 10 ? 'bg-red-500' : scorePercent >= 5 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
          <div>
            <div className="text-gray-400 text-[10px] uppercase">Model</div>
            <div className="font-semibold text-gray-700">RF v{stats.modelVersion}</div>
          </div>
        </div>

        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <div className="text-gray-400 text-[10px] uppercase">Latency</div>
            <div className="font-semibold text-gray-700">{stats.lastLatencyMs} ms</div>
          </div>
        </div>

        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <div className="text-gray-400 text-[10px] uppercase">Inference Cadence</div>
            <div className="font-semibold text-gray-700">{stats.inferenceFps} req/s</div>
          </div>
        </div>

        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-purple-500 shrink-0" />
          <div>
            <div className="text-gray-400 text-[10px] uppercase">Evaluations</div>
            <div className="font-semibold text-gray-700">{stats.totalInferences}</div>
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Privacy-Preserving: Only normalized skeletal coordinates are evaluated. Camera video is never sent or stored.</span>
      </div>
    </div>
  );
};
