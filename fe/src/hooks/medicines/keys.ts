/**
 * Query key factory for medicine queries.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: medicineKeys.lists() })
 *   queryClient.invalidateQueries({ queryKey: medicineKeys.detail(id) })
 */
export const medicineKeys = {
  all: ['medicines'] as const,
  lists: () => [...medicineKeys.all, 'list'] as const,
  detail: (id: string) => [...medicineKeys.all, 'detail', id] as const,
} as const;
