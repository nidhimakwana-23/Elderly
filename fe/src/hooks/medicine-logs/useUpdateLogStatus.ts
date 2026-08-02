import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { updateLogStatus, type UpdateLogStatusPayload } from '../../api/medicine-logs';
import { medicineLogKeys } from './keys';

export function useUpdateLogStatus(elderlyId: string | undefined, date: Date) {
  const queryClient = useQueryClient();
  const dateString = format(date, 'yyyy-MM-dd');

  return useMutation({
    mutationFn: ({ logId, payload }: { logId: string; payload: UpdateLogStatusPayload }) =>
      updateLogStatus(logId, payload),
    onSuccess: (response, { logId }) => {
      // Update the specific log in the cache without a full refetch
      queryClient.setQueryData<import('../../types/medication').MedicineLog[]>(
        medicineLogKeys.logsByDate(elderlyId ?? '', dateString),
        (old) => old?.map((log) => (log.id === logId ? response.log : log)) ?? [],
      );
    },
    onError: () => {
      // Invalidate so the query refetches the current truth from the server
      queryClient.invalidateQueries({
        queryKey: medicineLogKeys.logsByDate(elderlyId ?? '', dateString),
      });
    },
  });
}
