import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMedicine } from '../../api/medicines';
import { medicineKeys } from './keys';

export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.lists() });
    },
  });
}
