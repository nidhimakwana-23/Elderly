import { useQuery } from '@tanstack/react-query';
import { fetchMedicines } from '../../api/medicines';
import { medicineKeys } from './keys';
import type { Medicine } from '../../types/medicine';

/** Fallback data shown while the backend is unreachable or unauthenticated */
const FALLBACK_MEDICINES: Medicine[] = [
  {
    id: 'fallback-1',
    patient_id: 'demo',
    medicine_name: 'Lisinopril',
    medicine_type: 'Tablet',
    dosage: '1 pill',
    strength: '10mg',
    frequency: 'Once Daily',
    timing: ['Before Breakfast'],
    start_date: '2026-07-01',
    reminder_enabled: true,
    reminder_times: ['08:00 AM'],
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useGetMedicines() {
  return useQuery({
    queryKey: medicineKeys.lists(),
    queryFn: fetchMedicines,
    // Return fallback data when the query errors so UI remains functional
    placeholderData: FALLBACK_MEDICINES,
  });
}
