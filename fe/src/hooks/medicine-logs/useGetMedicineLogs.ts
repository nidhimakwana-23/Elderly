import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getMedicineLogs } from '../../api/medicine-logs';
import { medicineLogKeys } from './keys';
import type { MedicineLog } from '../../types/medication';

/** Fallback logs shown while the backend is unreachable */
function buildFallbackLogs(elderlyId: string, dateString: string): MedicineLog[] {
  return [
    {
      id: 'fallback-1',
      medicineId: 'm1',
      elderlyId,
      medicineName: 'Paracetamol',
      dosage: '500mg',
      scheduledDate: dateString,
      scheduledTime: '08:00 AM',
      takenTime: null,
      status: 'Pending',
      period: 'Morning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-2',
      medicineId: 'm2',
      elderlyId,
      medicineName: 'Vitamin D',
      dosage: '1 Tablet',
      scheduledDate: dateString,
      scheduledTime: '08:00 AM',
      takenTime: null,
      status: 'Pending',
      period: 'Morning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fallback-3',
      medicineId: 'm3',
      elderlyId,
      medicineName: 'BP Tablet',
      dosage: '20mg',
      scheduledDate: dateString,
      scheduledTime: '08:00 PM',
      takenTime: null,
      status: 'Pending',
      period: 'Evening',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function useGetMedicineLogs(elderlyId: string | undefined, date: Date) {
  const dateString = format(date, 'yyyy-MM-dd');
  return useQuery({
    queryKey: medicineLogKeys.logsByDate(elderlyId ?? '', dateString),
    queryFn: async () => {
      const result = await getMedicineLogs(elderlyId!, dateString);
      // If backend returns empty logs, show fallback so UI remains demonstrable
      return result.logs.length > 0
        ? result.logs
        : buildFallbackLogs(elderlyId!, dateString);
    },
    enabled: !!elderlyId,
    placeholderData: buildFallbackLogs(elderlyId ?? '', dateString),
  });
}
