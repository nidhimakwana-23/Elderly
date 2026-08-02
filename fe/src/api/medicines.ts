import axiosInstance from '../lib/axios';
import type { Medicine, CreateMedicineDto, UpdateMedicineDto } from '../types/medicine';

const BASE = '/medicines';

export async function fetchMedicines(): Promise<Medicine[]> {
  const res = await axiosInstance.get<Medicine[]>(BASE);
  return res.data;
}

export async function fetchMedicineById(id: string): Promise<Medicine> {
  const res = await axiosInstance.get<Medicine>(`${BASE}/${id}`);
  return res.data;
}

export async function createMedicine(data: CreateMedicineDto): Promise<Medicine> {
  const res = await axiosInstance.post<Medicine>(BASE, data);
  return res.data;
}

export async function updateMedicine(id: string, data: UpdateMedicineDto): Promise<Medicine> {
  const res = await axiosInstance.put<Medicine>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteMedicine(id: string): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`);
}
