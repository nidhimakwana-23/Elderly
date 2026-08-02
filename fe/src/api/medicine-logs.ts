import axiosInstance from '../lib/axios';
import type { MedicineLog, MedicineReportSummary } from '../types/medication';

const LOGS_BASE = '/medicine-logs';
const REPORT_BASE = '/medicine-report';

// ── Logs ─────────────────────────────────────────────────────────────────────

export interface GetLogsResponse {
  logs: MedicineLog[];
}

export async function getMedicineLogs(
  elderlyId: string,
  date?: string,
): Promise<GetLogsResponse> {
  const res = await axiosInstance.get<GetLogsResponse>(`${LOGS_BASE}/${elderlyId}`, {
    params: date ? { date } : undefined,
  });
  return res.data;
}

export interface UpdateLogStatusPayload {
  status: 'Taken' | 'Skipped';
  skippedReason?: string;
  takenTime?: string;
}

export interface UpdateLogStatusResponse {
  message: string;
  log: MedicineLog;
}

export async function updateLogStatus(
  logId: string,
  payload: UpdateLogStatusPayload,
): Promise<UpdateLogStatusResponse> {
  const res = await axiosInstance.patch<UpdateLogStatusResponse>(
    `${LOGS_BASE}/${logId}/status`,
    payload,
  );
  return res.data;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function getMonthlyReport(elderlyId: string): Promise<MedicineReportSummary> {
  const res = await axiosInstance.get<MedicineReportSummary>(
    `${REPORT_BASE}/${elderlyId}/monthly`,
  );
  return res.data;
}

export async function getDailyReport(elderlyId: string): Promise<MedicineReportSummary> {
  const res = await axiosInstance.get<MedicineReportSummary>(
    `${REPORT_BASE}/${elderlyId}/daily`,
  );
  return res.data;
}

export async function getWeeklyReport(elderlyId: string): Promise<MedicineReportSummary> {
  const res = await axiosInstance.get<MedicineReportSummary>(
    `${REPORT_BASE}/${elderlyId}/weekly`,
  );
  return res.data;
}
