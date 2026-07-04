import type { Medicine, CreateMedicineDto, UpdateMedicineDto } from '../types/medicine';

const API_URL = '/api/medicines';
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchMedicines(): Promise<Medicine[]> {
  const res = await fetch(API_URL, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch medicines');
  return res.json();
}

export async function createMedicine(data: CreateMedicineDto): Promise<Medicine> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create medicine');
  return res.json();
}

export async function updateMedicine(id: string, data: UpdateMedicineDto): Promise<Medicine> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update medicine');
  return res.json();
}

export async function deleteMedicine(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete medicine');
}
