export interface MedicineLog {
  id: string;
  medicineId: string;
  elderlyId: string;
  medicineName: string;
  dosage: string;
  scheduledDate: string;
  scheduledTime: string;
  takenTime: string | null;
  status: 'Pending' | 'Taken' | 'Skipped' | 'Missed';
  skippedReason?: string;
  period?: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  /** ISO datetime set when the log is soft-deleted; absent on active records. */
  deleted_at?: string;
}

export type CreateMedicineLogDto = Omit<MedicineLog, 'id' | 'createdAt' | 'updatedAt' | 'takenTime'> & { takenTime?: string | null };

export interface MedicineReportDaily {
  medicineName: string;
  status: 'Pending' | 'Taken' | 'Skipped' | 'Missed';
  scheduledTime: string;
  takenTime: string | null;
}

export interface MedicineReportSummary {
  elderlyName: string;
  totalMedicines: number;
  taken: number;
  missed: number;
  pending: number;
  adherence: string;
  today: MedicineReportDaily[];
}
