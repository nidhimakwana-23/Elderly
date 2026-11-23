import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { FallEventRecord } from '../types/fall-detection.types';

interface CaregiverAlertBannerProps {
  unresolvedEvents: FallEventRecord[];
  onViewEvents: () => void;
  onAcknowledge?: (eventId: string) => void;
}

export const CaregiverAlertBanner: React.FC<CaregiverAlertBannerProps> = ({
  unresolvedEvents,
  onViewEvents,
  onAcknowledge,
}) => {
  if (unresolvedEvents.length === 0) return null;

  const latestEvent = unresolvedEvents[0];
  const count = unresolvedEvents.length;

  return (
    <div className="bg-red-500 text-white px-4 py-3 shadow-md border-b-2 border-red-700 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide flex items-center gap-2">
              <span>FALL ALERT REQUIRING ATTENTION</span>
              {count > 1 && (
                <span className="bg-white text-red-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {count} Active
                </span>
              )}
            </div>
            <div className="text-xs text-red-100">
              {latestEvent.patient_name || 'Linked elderly member'} · Detected at{' '}
              {new Date(latestEvent.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Risk score: {Math.round(latestEvent.fall_score * 100)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAcknowledge && latestEvent.status !== 'acknowledged' && (
            <button
              onClick={() => onAcknowledge(latestEvent.id)}
              className="px-3 py-1.5 bg-white text-red-700 font-bold rounded-lg text-xs hover:bg-red-50 transition shadow-xs"
            >
              Acknowledge
            </button>
          )}

          <button
            onClick={onViewEvents}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg text-xs transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
