import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarView } from '../components/Medication/CalendarView';
import { DailyProgress } from '../components/Medication/DailyProgress';
import { DashboardWidget } from '../components/Medication/DashboardWidget';
import { MedicineCard } from '../components/Medication/MedicineCard';
import { MonthlyReport } from '../components/Medication/MonthlyReport';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGetMedicineLogs } from '../hooks/medicine-logs/useGetMedicineLogs';
import { useUpdateLogStatus } from '../hooks/medicine-logs/useUpdateLogStatus';

const periods = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

export const MedicationTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Auth — elderlyId is the logged-in user's ID ───────────────────────────
  const { user } = useAuth();
  const elderlyId = user?.id;

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: logs = [], isLoading } = useGetMedicineLogs(elderlyId, selectedDate);
  const updateStatusMutation = useUpdateLogStatus(elderlyId, selectedDate);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (
    id: string,
    status: 'Taken' | 'Skipped',
    skippedReason?: string,
  ) => {
    const takenTime =
      status === 'Taken'
        ? new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined;

    await updateStatusMutation.mutateAsync({
      logId: id,
      payload: { status, skippedReason, takenTime },
    });
  };

  const getLogsForPeriod = (period: string) =>
    logs.filter((log) => log.period === period);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">
            Medication Tracker
          </h1>
          <button className="p-2 rounded-full hover:bg-gray-100 relative transition-colors">
            <Bell size={24} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CalendarView selectedDate={selectedDate} onChangeDate={setSelectedDate} />

            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Schedule for {format(selectedDate, 'dd MMM yyyy')}
              </h2>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="space-y-8">
                {periods.map((period) => {
                  const periodLogs = getLogsForPeriod(period);
                  if (periodLogs.length === 0) return null;
                  return (
                    <div key={period} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-bold mb-4 text-indigo-900 border-b pb-2">
                        {period}
                      </h3>
                      <div className="space-y-4">
                        {periodLogs.map((log) => (
                          <MedicineCard
                            key={log.id}
                            log={log}
                            onUpdateStatus={handleUpdateStatus}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {logs.length === 0 && (
                  <div className="bg-white p-12 rounded-xl border text-center text-gray-500 shadow-sm">
                    No medications scheduled for this date.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <DashboardWidget logs={logs} />
            <DailyProgress logs={logs} />
          </div>
        </div>

        <MonthlyReport elderlyId={elderlyId ?? ''} />
      </main>
    </div>
  );
};
