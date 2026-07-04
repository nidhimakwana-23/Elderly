import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MedicineLog } from '../types/medication';
import { CalendarView } from '../components/Medication/CalendarView';
import { DailyProgress } from '../components/Medication/DailyProgress';
import { DashboardWidget } from '../components/Medication/DashboardWidget';
import { MedicineCard } from '../components/Medication/MedicineCard';
import { MonthlyReport } from '../components/Medication/MonthlyReport';
import { Bell } from 'lucide-react';

export const MedicationTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<MedicineLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Hardcoded for demo, normally from auth context
  const elderlyId = 'elderly-123';

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate]);

  const fetchLogs = async (date: Date) => {
    try {
      setLoading(true);
      const dateString = format(date, 'yyyy-MM-dd');
      // For demo, if API isn't fully ready, provide fallback
      const res = await fetch(`/api/medicine-logs/${elderlyId}?date=${dateString}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
        } else {
          generateMockLogs(dateString);
        }
      } else {
        generateMockLogs(dateString);
      }
    } catch (e) {
      console.error(e);
      generateMockLogs(format(date, 'yyyy-MM-dd'));
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = (dateString: string) => {
    setLogs([
      {
        id: '1', medicineId: 'm1', elderlyId, medicineName: 'Paracetamol', dosage: '500mg',
        scheduledDate: dateString, scheduledTime: '08:00 AM', takenTime: null, status: 'Pending', period: 'Morning',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: '2', medicineId: 'm2', elderlyId, medicineName: 'Vitamin D', dosage: '1 Tablet',
        scheduledDate: dateString, scheduledTime: '08:00 AM', takenTime: null, status: 'Pending', period: 'Morning',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      },
      {
        id: '3', medicineId: 'm3', elderlyId, medicineName: 'BP Tablet', dosage: '20mg',
        scheduledDate: dateString, scheduledTime: '08:00 PM', takenTime: null, status: 'Pending', period: 'Evening',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }
    ]);
  };

  const handleUpdateStatus = async (id: string, status: 'Taken' | 'Skipped', skippedReason?: string) => {
    try {
      const takenTime = status === 'Taken' ? new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }) : undefined;
      
      const res = await fetch(`/api/medicine-logs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, skippedReason, takenTime })
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(prev => prev.map(log => log.id === id ? data.log : log));
      } else {
        // Optimistic update for demo purposes
        setLogs(prev => prev.map(log => {
          if (log.id === id) {
            return { ...log, status, skippedReason, takenTime };
          }
          return log;
        }));
      }
    } catch (e) {
      console.error(e);
      // Optimistic update fallback
      const takenTime = status === 'Taken' ? new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }) : undefined;
      setLogs(prev => prev.map(log => {
        if (log.id === id) {
          return { ...log, status, skippedReason, takenTime };
        }
        return log;
      }));
    }
  };

  const getLogsForPeriod = (period: string) => {
    return logs.filter(log => log.period === period);
  };

  const periods = ['Morning', 'Afternoon', 'Evening', 'Night'];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">Medication Tracker</h1>
          <button className="p-2 rounded-full hover:bg-gray-100 relative transition-colors">
            <Bell size={24} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
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

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {periods.map(period => {
                  const periodLogs = getLogsForPeriod(period);
                  if (periodLogs.length === 0) return null;

                  return (
                    <div key={period} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-bold mb-4 text-indigo-900 border-b pb-2">{period}</h3>
                      <div className="space-y-4">
                        {periodLogs.map(log => (
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

        <MonthlyReport elderlyId={elderlyId} />
      </main>
    </div>
  );
};
