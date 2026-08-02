import axiosInstance from '../lib/axios';
import type { HealthCheck, CreateHealthCheckDto, UpdateHealthCheckDto } from '../types/health-check';

const BASE = '/health-checks';

export async function fetchHealthChecks(patientId: string): Promise<HealthCheck[]> {
  const res = await axiosInstance.get<HealthCheck[]>(BASE, {
    params: { patient_id: patientId },
  });
  return res.data;
}

export async function fetchHealthCheckById(id: string): Promise<HealthCheck> {
  const res = await axiosInstance.get<HealthCheck>(`${BASE}/${id}`);
  return res.data;
}

export async function createHealthCheck(data: CreateHealthCheckDto): Promise<HealthCheck> {
  const res = await axiosInstance.post<HealthCheck>(BASE, data);
  return res.data;
}

export async function updateHealthCheck(
  id: string,
  data: UpdateHealthCheckDto,
): Promise<HealthCheck> {
  const res = await axiosInstance.put<HealthCheck>(`${BASE}/${id}`, data);
  return res.data;
}

export async function deleteHealthCheck(id: string): Promise<void> {
  await axiosInstance.delete(`${BASE}/${id}`);
}
