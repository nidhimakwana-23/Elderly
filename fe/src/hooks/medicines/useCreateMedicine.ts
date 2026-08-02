import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMedicine } from '../../api/medicines';
import { medicineKeys } from './keys';

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.lists() });
    },
  });
}
