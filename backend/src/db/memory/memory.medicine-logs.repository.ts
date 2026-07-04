import type { MedicineLog } from '../../medicine-logs/medicine-logs.types.js';
import type { IMedicineLogsRepository } from '../medicine-logs.repository.js';

export class MemoryMedicineLogsRepository implements IMedicineLogsRepository {
  private readonly store = new Map<string, MedicineLog>();

  async create(log: MedicineLog): Promise<MedicineLog> {
    this.store.set(log.id, log);
    return log;
  }

  async findById(id: string): Promise<MedicineLog | null> {
    return this.store.get(id) || null;
  }

  async update(id: string, partialLog: Partial<MedicineLog>): Promise<MedicineLog | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partialLog, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return updated;
  }

  async findByElderlyId(elderlyId: string): Promise<MedicineLog[]> {
    const logs: MedicineLog[] = [];
    for (const log of this.store.values()) {
      if (log.elderlyId === elderlyId) {
        logs.push(log);
      }
    }
    return logs;
  }

  async findLogsByDateRange(elderlyId: string, startDate: string, endDate: string): Promise<MedicineLog[]> {
    const logs: MedicineLog[] = [];
    const start = new Date(startDate).getTime();
    // Assume endDate is inclusive for the day if it doesn't have time, but let's just do standard string comparison or Date parsing
    const end = new Date(endDate).getTime();

    for (const log of this.store.values()) {
      if (log.elderlyId === elderlyId) {
        const logDate = new Date(log.scheduledDate).getTime();
        if (logDate >= start && logDate <= end) {
          logs.push(log);
        }
      }
    }
    return logs;
  }
}
