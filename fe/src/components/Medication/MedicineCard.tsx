import React, { useState } from 'react';
import { MedicineLog } from '../../types/medication';
import { CheckCircle, XCircle, Clock, Pill } from 'lucide-react';

interface MedicineCardProps {
  log: MedicineLog;
  onUpdateStatus: (id: string, status: 'Taken' | 'Skipped', skippedReason?: string) => void;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({ log, onUpdateStatus }) => {
  const [showSkipReason, setShowSkipReason] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Taken':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'Skipped':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'Missed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'Pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'Taken': return 'text-emerald-500';
      case 'Skipped': return 'text-orange-500';
      case 'Missed': return 'text-red-500';
      case 'Pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const handleSkipSubmit = () => {
    onUpdateStatus(log.id, 'Skipped', skipReason);
    setShowSkipReason(false);
  };

  return (
    <div className={`p-4 rounded-xl border mb-4 transition-all duration-300 ${getStatusColor(log.status)} shadow-sm hover:shadow-md flex flex-col md:flex-row gap-4 items-start md:items-center justify-between`}>
      <div className="flex gap-4 items-start">
        <div className={`p-3 rounded-full bg-white shadow-sm ${getIconColor(log.status)}`}>
          <Pill size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg">{log.medicineName}</h3>
          <p className="text-sm opacity-80 mb-1">{log.dosage}</p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock size={16} />
            <span>{log.scheduledTime}</span>
          </div>
          {log.status === 'Taken' && log.takenTime && (
            <p className="text-xs mt-1 font-medium bg-emerald-100 text-emerald-700 inline-block px-2 py-0.5 rounded-full">
              Taken at {log.takenTime}
            </p>
          )}
          {log.status === 'Skipped' && log.skippedReason && (
            <p className="text-xs mt-1 italic opacity-80">
              Reason: {log.skippedReason}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
        <div className="flex justify-end gap-2">
          {log.status === 'Pending' && (
            <>
              <button
                onClick={() => onUpdateStatus(log.id, 'Taken')}
                className="flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto"
              >
                <CheckCircle size={18} />
                <span>Take</span>
              </button>
              <button
                onClick={() => setShowSkipReason(!showSkipReason)}
                className="flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto"
              >
                <XCircle size={18} />
                <span>Skip</span>
              </button>
            </>
          )}
          {log.status !== 'Pending' && (
            <div className="font-semibold text-lg px-4 py-2 bg-white bg-opacity-50 rounded-lg">
              {log.status}
            </div>
          )}
        </div>
        
        {showSkipReason && (
          <div className="flex gap-2 mt-2">
            <input 
              type="text" 
              placeholder="Reason for skipping?" 
              className="px-3 py-2 text-sm rounded border border-orange-300 focus:outline-none focus:ring focus:ring-orange-200 flex-1 bg-white"
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
            />
            <button 
              onClick={handleSkipSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
