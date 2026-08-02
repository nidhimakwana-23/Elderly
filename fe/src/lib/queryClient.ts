import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds before a background refetch
      staleTime: 30_000,
      // Keep unused cache entries for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry once on failure (the second attempt is usually enough to catch transient errors)
      retry: 1,
    },
  },
});
