import React from 'react';
import { MedicineLog } from '../../types/medication';

interface DailyProgressProps {
  logs: MedicineLog[];
}

export const DailyProgress: React.FC<DailyProgressProps> = ({ logs }) => {
  const total = logs.length;
  const taken = logs.filter(log => log.status === 'Taken').length;
  const skipped = logs.filter(log => log.status === 'Skipped').length;
  const missed = logs.filter(log => log.status === 'Missed').length;
  
  const percentage = total === 0 ? 0 : Math.round((taken / total) * 100);

  const getPeriodStats = (period: string) => {
    const periodLogs = logs.filter(log => log.period === period);
    const pTotal = periodLogs.length;
    const pTaken = periodLogs.filter(log => log.status === 'Taken').length;
    const pMissed = periodLogs.filter(log => log.status === 'Missed').length;
    return { total: pTotal, taken: pTaken, missed: pMissed };
  };

  const periods = ['Morning', 'Afternoon', 'Evening', 'Night'];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-xl font-bold mb-6">Daily Progress</h2>
      
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-indigo-600 transition-all duration-1000 ease-in-out"
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="4"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-indigo-900">{percentage}%</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2 font-medium">{taken} of {total} Complete</p>
      </div>

      <div className="space-y-4">
        {periods.map(period => {
          const stats = getPeriodStats(period);
          if (stats.total === 0) return null;
          
          return (
            <div key={period} className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">{period}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{stats.taken} / {stats.total}</span>
                {stats.missed > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {stats.missed} Missed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {total > 0 && (
        <div className="mt-6 pt-4 border-t flex justify-between text-xs font-medium">
          <div className="flex items-center gap-1 text-emerald-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Taken: {taken}
          </div>
          <div className="flex items-center gap-1 text-orange-600">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Skipped: {skipped}
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            Missed: {missed}
          </div>
        </div>
      )}
    </div>
  );
};
