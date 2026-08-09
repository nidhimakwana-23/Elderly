import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getMedicineLogs } from '../../api/medicine-logs';
import { medicineLogKeys } from './keys';

export function useGetMedicineLogs(elderlyId: string | undefined, date: Date) {
  const dateString = format(date, 'yyyy-MM-dd');
  return useQuery({
    queryKey: medicineLogKeys.logsByDate(elderlyId ?? '', dateString),
    queryFn: async () => {
      const result = await getMedicineLogs(elderlyId!, dateString);
      return result.logs;
    },
    enabled: !!elderlyId,
  });
}
