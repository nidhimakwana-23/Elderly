import { useQuery } from '@tanstack/react-query';
import { getMonthlyReport } from '../../api/medicine-logs';
import { medicineLogKeys } from './keys';
import type { MedicineReportSummary } from '../../types/medication';

const FALLBACK_REPORT: MedicineReportSummary = {
  elderlyName: 'Patient',
  totalMedicines: 5,
  taken: 45,
  missed: 5,
  pending: 0,
  adherence: '90%',
  today: [],
};

export function useGetMonthlyReport(elderlyId: string | undefined) {
  return useQuery({
    queryKey: medicineLogKeys.monthlyReport(elderlyId ?? ''),
    queryFn: () => getMonthlyReport(elderlyId!),
    enabled: !!elderlyId,
    placeholderData: FALLBACK_REPORT,
  });
}
