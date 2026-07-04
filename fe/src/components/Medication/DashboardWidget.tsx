import React from 'react';
import { MedicineLog } from '../../types/medication';
import { Pill, CheckCircle, Clock } from 'lucide-react';

interface DashboardWidgetProps {
  logs: MedicineLog[];
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ logs }) => {
  const total = logs.length;
  const taken = logs.filter(log => log.status === 'Taken').length;
  const missed = logs.filter(log => log.status === 'Missed').length;
  const upcoming = logs.filter(log => log.status === 'Pending').length;
  const percentage = total === 0 ? 0 : Math.round((taken / total) * 100);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border mb-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-gray-800">Today's Medication</h3>
        <span className="text-sm font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
          {percentage}% Complete
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
          <Pill size={20} className="text-gray-400 mb-1" />
          <span className="text-xl font-bold">{total}</span>
          <span className="text-xs text-gray-500 font-medium">Total</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg">
          <CheckCircle size={20} className="text-emerald-500 mb-1" />
          <span className="text-xl font-bold text-emerald-700">{taken}</span>
          <span className="text-xs text-emerald-600 font-medium">Taken</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
          <Clock size={20} className="text-blue-500 mb-1" />
          <span className="text-xl font-bold text-blue-700">{upcoming}</span>
          <span className="text-xs text-blue-600 font-medium">Upcoming</span>
        </div>
      </div>

      {missed > 0 && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center justify-center font-medium">
          Warning: You have {missed} missed medication{missed > 1 ? 's' : ''} today.
        </div>
      )}
    </div>
  );
};
