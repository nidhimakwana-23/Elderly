import { useQuery } from '@tanstack/react-query';
import { getMonthlyReport } from '../../api/medicine-logs';
import { medicineLogKeys } from './keys';

export function useGetMonthlyReport(elderlyId: string | undefined) {
  return useQuery({
    queryKey: medicineLogKeys.monthlyReport(elderlyId ?? ''),
    queryFn: () => getMonthlyReport(elderlyId!),
    enabled: !!elderlyId,
  });
}
