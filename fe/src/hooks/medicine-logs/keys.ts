/**
 * Query key factory for medicine-log and medicine-report queries.
 */
export const medicineLogKeys = {
  all: ['medicine-logs'] as const,
  logs: (elderlyId: string) => [...medicineLogKeys.all, 'logs', elderlyId] as const,
  logsByDate: (elderlyId: string, date: string) =>
    [...medicineLogKeys.logs(elderlyId), date] as const,
  reports: (elderlyId: string) => [...medicineLogKeys.all, 'reports', elderlyId] as const,
  monthlyReport: (elderlyId: string) =>
    [...medicineLogKeys.reports(elderlyId), 'monthly'] as const,
  dailyReport: (elderlyId: string) =>
    [...medicineLogKeys.reports(elderlyId), 'daily'] as const,
  weeklyReport: (elderlyId: string) =>
    [...medicineLogKeys.reports(elderlyId), 'weekly'] as const,
} as const;
