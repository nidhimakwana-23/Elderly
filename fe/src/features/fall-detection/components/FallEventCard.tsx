import React from 'react';
import { CheckCircle, Clock, ShieldCheck, XCircle } from 'lucide-react';
import type { FallEventRecord } from '../types/fall-detection.types';

interface FallEventCardProps {
  event: FallEventRecord;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export const FallEventCard: React.FC<FallEventCardProps> = ({
  event,
  onAcknowledge,
  onResolve,
}) => {
  const getStatusBadge = () => {
    switch (event.status) {
      case 'suspected':
      case 'awaiting_response':
        return {
          label: 'Awaiting Response',
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case 'acknowledged':
        return {
          label: 'Acknowledged',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
        };
      case 'resolved':
        return {
          label: 'Resolved',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckCircle className="w-3.5 h-3.5" />,
        };
      case 'false_alarm':
        return {
          label: 'False Alarm',
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: event.status,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: null,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const scorePercent = Math.round(event.fall_score * 100);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 text-base">
              {event.patient_name || 'Patient'}
            </h4>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.color}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Detected: {new Date(event.detected_at).toLocaleString()}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-extrabold text-red-600">
            {scorePercent}% Risk
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
            Severity: {event.severity}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
        {event.description || 'Movement pattern matched fall profile.'}
      </p>

      {/* Metadata / Lifecycle timestamps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
        {event.acknowledged_at && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">Acknowledged:</span>
            <span>
              {new Date(event.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
              {event.acknowledged_by ? `by ${event.acknowledged_by}` : ''}
            </span>
          </div>
        )}
        {event.resolved_at && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">Resolved:</span>
            <span>
              {new Date(event.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
              {event.resolved_by ? `by ${event.resolved_by}` : ''}
            </span>
          </div>
        )}
        {event.false_alarm_at && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-700">Marked False Alarm:</span>
            <span>
              {new Date(event.false_alarm_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        {onAcknowledge && (event.status === 'awaiting_response' || event.status === 'suspected') && (
          <button
            onClick={() => onAcknowledge(event.id)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
          >
            Acknowledge
          </button>
        )}

        {onResolve && event.status !== 'resolved' && event.status !== 'false_alarm' && (
          <button
            onClick={() => onResolve(event.id)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-xs"
          >
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
};
