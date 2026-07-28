import type { HealthCheck, CreateHealthCheckDto, UpdateHealthCheckDto } from '../types/health-check';

const API_URL = '/api/health-checks';
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchHealthChecks(patientId: string): Promise<HealthCheck[]> {
  const res = await fetch(`${API_URL}?patient_id=${patientId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch health checks');
  return res.json();
}

export async function createHealthCheck(data: CreateHealthCheckDto): Promise<HealthCheck> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create health check');
  return res.json();
}

export async function updateHealthCheck(id: string, data: UpdateHealthCheckDto): Promise<HealthCheck> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update health check');
  return res.json();
}

export async function deleteHealthCheck(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete health check');
}
