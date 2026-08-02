import { useQuery } from '@tanstack/react-query';
import { fetchHealthChecks } from '../../api/health-checks';
import { healthCheckKeys } from './keys';
import type { HealthCheck } from '../../types/health-check';

/** Fallback data shown while the backend is unreachable */
const FALLBACK_HEALTH_CHECKS: HealthCheck[] = [
  {
    id: 'fallback-1',
    patient_id: 'demo',
    date: '2026-07-15',
    sugar_level: 95,
    weight: 71.2,
    blood_pressure: '120/80',
    blood_level: '98%',
    bmi: 24.5,
    notes: 'Feeling good, standard checkup.',
  },
  {
    id: 'fallback-2',
    patient_id: 'demo',
    date: '2026-07-10',
    sugar_level: 102,
    weight: 72.0,
    blood_pressure: '125/85',
    blood_level: '97%',
    bmi: 24.8,
  },
];

export function useGetHealthChecks(patientId: string | undefined) {
  return useQuery({
    queryKey: healthCheckKeys.list(patientId ?? ''),
    queryFn: () => fetchHealthChecks(patientId!),
    enabled: !!patientId,
    placeholderData: FALLBACK_HEALTH_CHECKS,
  });
}
