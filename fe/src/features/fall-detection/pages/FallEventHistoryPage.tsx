import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useFallEvents } from '../hooks/useFallEvents';
import { FallEventCard } from '../components/FallEventCard';
import { History, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const FallEventHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const isCaregiver = user?.role === 'family';
  const { events, isLoading, error, refresh, acknowledge, resolve } = useFallEvents(isCaregiver);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['suspected', 'awaiting_response', 'acknowledged'].includes(e.status);
    return e.status === statusFilter;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isCaregiver ? 'Caregiver Fall Incident History' : 'My Fall Event History'}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isCaregiver
              ? 'Monitoring log and incidents recorded for linked elderly family members.'
              : 'Chronological log of movement anomalies and recorded fall incidents.'}
          </p>
        </div>

        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {[
          { id: 'all', label: 'All Incidents' },
          { id: 'active', label: 'Active / Unresolved' },
          { id: 'awaiting_response', label: 'Awaiting Response' },
          { id: 'acknowledged', label: 'Acknowledged' },
          { id: 'resolved', label: 'Resolved' },
          { id: 'false_alarm', label: 'False Alarms' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && events.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading incident records...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredEvents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">No Fall Incidents Recorded</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'No fall events have been detected or recorded for this account.'
              : `No incidents found matching the "${statusFilter}" filter.`}
          </p>
        </div>
      )}

      {/* Event list */}
      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <FallEventCard
            key={event.id}
            event={event}
            onAcknowledge={acknowledge}
            onResolve={resolve}
          />
        ))}
      </div>
    </div>
  );
};
