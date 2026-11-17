import { useCallback } from 'react';
import { createSession } from '../api/ai';

/**
 * Hook to create an AI session for a patient.
 * Returns a create function that resolves to the session id.
 */
export const useCreateSession = () => {
  const create = useCallback(async (patientId: string): Promise<string | undefined> => {
    try {
      const data = await createSession(patientId);
      // Assuming the API returns an object with an `id` field.
      return data.id;
    } catch (error) {
      console.error('Failed to create AI session via hook', error);
      return undefined;
    }
  }, []);

  return { create };
};
