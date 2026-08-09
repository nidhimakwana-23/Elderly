import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFamilyMember } from '../../api/family';
import { familyKeys } from './useGetFamilyMembers';
import type { CreateFamilyProfileInput } from '../../types/family-member';

export function useCreateFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFamilyProfileInput) => createFamilyMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.lists() });
    },
  });
}
