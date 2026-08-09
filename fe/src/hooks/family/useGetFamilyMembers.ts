import { useQuery } from '@tanstack/react-query';
import { fetchFamilyMembers } from '../../api/family';

export const familyKeys = {
  all: ['family-members'] as const,
  lists: () => [...familyKeys.all, 'list'] as const,
};

export function useGetFamilyMembers() {
  return useQuery({
    queryKey: familyKeys.lists(),
    queryFn: fetchFamilyMembers,
  });
}
