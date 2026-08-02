import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHealthCheck } from '../../api/health-checks';
import { healthCheckKeys } from './keys';

export function useCreateHealthCheck(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHealthCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: healthCheckKeys.list(patientId ?? ''),
      });
    },
  });
}
