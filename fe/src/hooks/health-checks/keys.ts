/**
 * Query key factory for health-check queries.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: healthCheckKeys.list(patientId) })
 */
export const healthCheckKeys = {
  all: ['health-checks'] as const,
  lists: () => [...healthCheckKeys.all, 'list'] as const,
  list: (patientId: string) => [...healthCheckKeys.lists(), patientId] as const,
  detail: (id: string) => [...healthCheckKeys.all, 'detail', id] as const,
} as const;
