import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMedicine } from '../../api/medicines';
import { medicineKeys } from './keys';

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMedicine>[1] }) =>
      updateMedicine(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicineKeys.detail(id) });
    },
  });
}
