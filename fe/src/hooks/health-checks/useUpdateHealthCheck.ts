import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHealthCheck } from '../../api/health-checks';
import { healthCheckKeys } from './keys';

export function useUpdateHealthCheck(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateHealthCheck>[1] }) =>
      updateHealthCheck(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: healthCheckKeys.list(patientId ?? '') });
      queryClient.invalidateQueries({ queryKey: healthCheckKeys.detail(id) });
    },
  });
}
