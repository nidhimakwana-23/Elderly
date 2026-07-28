import { randomUUID } from 'crypto';
import type { IMedicineLogsRepository } from '../db/medicine-logs.repository.js';
import type { CreateMedicineLogDto, MedicineLog, MedicineReportSummary } from './medicine-logs.types.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MedicineLogsService {
  constructor(private readonly medicineLogsRepository: IMedicineLogsRepository) {}

  async logMedicine(data: CreateMedicineLogDto): Promise<MedicineLog> {
    if (!data.medicineId || !data.elderlyId || !data.medicineName || !data.scheduledDate || !data.scheduledTime || !data.status) {
      throw new ValidationError('Missing required fields for medicine log.');
    }

    const log: MedicineLog = {
      id: randomUUID(),
      ...data,
      takenTime: data.takenTime || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.medicineLogsRepository.create(log);
  }

  async updateLogStatus(id: string, status: 'Pending' | 'Taken' | 'Skipped' | 'Missed', skippedReason?: string, takenTime?: string): Promise<MedicineLog> {
    const existing = await this.medicineLogsRepository.findById(id);
    if (!existing) {
      throw new ValidationError('Medicine log not found');
    }

    const updateData: Partial<MedicineLog> = { status };
    if (status === 'Taken') {
      updateData.takenTime = takenTime || new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    } else if (status === 'Skipped') {
      updateData.skippedReason = skippedReason;
    }

    const updated = await this.medicineLogsRepository.update(id, updateData);
    if (!updated) {
      throw new ValidationError('Failed to update medicine log');
    }
    return updated;
  }

  async getMedicineHistory(elderlyId: string, date?: string): Promise<MedicineLog[]> {
    if (!elderlyId) {
      throw new ValidationError('elderlyId is required');
    }
    const logs = await this.medicineLogsRepository.findByElderlyId(elderlyId);
    if (date) {
      return logs.filter(log => log.scheduledDate === date);
    }
    return logs;
  }

  async generateReport(elderlyId: string, timeframe: 'daily' | 'weekly' | 'monthly' | 'all'): Promise<MedicineReportSummary> {
    const todayDate = new Date();
    let startDate = new Date(0); // Epoch for all time
    let endDate = new Date();

    if (timeframe === 'daily') {
      startDate = new Date(todayDate.setHours(0, 0, 0, 0));
    } else if (timeframe === 'weekly') {
      startDate = new Date(todayDate);
      startDate.setDate(todayDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'monthly') {
      startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    }

    let logs: MedicineLog[] = [];
    if (timeframe === 'all') {
      logs = await this.medicineLogsRepository.findByElderlyId(elderlyId);
    } else {
      logs = await this.medicineLogsRepository.findLogsByDateRange(elderlyId, startDate.toISOString(), endDate.toISOString());
    }

    let taken = 0;
    let missed = 0;
    let pending = 0;
    const uniqueMedicines = new Set<string>();

    const todayString = new Date().toISOString().split('T')[0];
    const todayLogs = [];

    for (const log of logs) {
      uniqueMedicines.add(log.medicineName);
      if (log.status === 'Taken') taken++;
      if (log.status === 'Missed') missed++;
      if (log.status === 'Pending') pending++;

      if (log.scheduledDate === todayString) {
        todayLogs.push({
          medicineName: log.medicineName,
          status: log.status,
          scheduledTime: log.scheduledTime,
          takenTime: log.takenTime,
        });
      }
    }

    const totalDoses = taken + missed + pending;
    let adherence = '0%';
    if (totalDoses > 0) {
      // Usually adherence is (taken / (taken + missed)) but here we can do taken / (taken + missed) ignoring pending
      const pastDoses = taken + missed;
      if (pastDoses > 0) {
        adherence = `${Math.round((taken / pastDoses) * 100)}%`;
      }
    }

    return {
      elderlyName: 'Elderly Person', // Ideally fetched from family repo, but let's mock or rely on client data
      totalMedicines: uniqueMedicines.size,
      taken,
      missed,
      pending,
      adherence,
      today: todayLogs,
    };
  }
}
