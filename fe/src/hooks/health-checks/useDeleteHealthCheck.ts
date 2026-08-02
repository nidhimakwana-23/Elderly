import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteHealthCheck } from '../../api/health-checks';
import { healthCheckKeys } from './keys';

export function useDeleteHealthCheck(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHealthCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthCheckKeys.list(patientId ?? '') });
    },
  });
}
