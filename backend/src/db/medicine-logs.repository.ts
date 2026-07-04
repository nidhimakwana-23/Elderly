import type { MedicineLog } from '../medicine-logs/medicine-logs.types.js';

export interface IMedicineLogsRepository {
  create(log: MedicineLog): Promise<MedicineLog>;
  findByElderlyId(elderlyId: string): Promise<MedicineLog[]>;
  findById(id: string): Promise<MedicineLog | null>;
  update(id: string, log: Partial<MedicineLog>): Promise<MedicineLog | null>;
  findLogsByDateRange(elderlyId: string, startDate: string, endDate: string): Promise<MedicineLog[]>;
}
