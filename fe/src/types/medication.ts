export type MedicineStatus = 'Pending' | 'Taken' | 'Skipped' | 'Missed';
export type MedicinePeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface MedicineLog {
  id: string;
  medicineId: string;
  elderlyId: string;
  medicineName: string;
  dosage: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM AM/PM
  takenTime: string | null;
  status: MedicineStatus;
  skippedReason?: string;
  period?: MedicinePeriod;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineReportDaily {
  medicineName: string;
  status: MedicineStatus;
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
