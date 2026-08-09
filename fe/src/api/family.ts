import axiosInstance from '../lib/axios';
import type { FamilyProfile, CreateFamilyProfileInput } from '../types/family-member';

const BASE = '/family';

export async function fetchFamilyMembers(): Promise<FamilyProfile[]> {
  const res = await axiosInstance.get<{ profiles: FamilyProfile[] }>(BASE);
  return res.data.profiles;
}

export async function createFamilyMember(data: CreateFamilyProfileInput): Promise<FamilyProfile> {
  const res = await axiosInstance.post<{ message: string; profile: FamilyProfile }>(BASE, data);
  return res.data.profile;
}
