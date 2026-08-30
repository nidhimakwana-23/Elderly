import type { MedicineLog } from '../../medicine-logs/medicine-logs.types.js';
import type { IMedicineLogsRepository } from '../medicine-logs.repository.js';
import { MedicineLogModel } from './medicine-log.model.js';
import { ACTIVE_FILTER } from './soft-delete.js';

/**
 * MongooseMedicineLogsRepository — persists MedicineLogs in MongoDB.
 *
 * Date-range queries use MongoDB's $gte / $lte on ISO 8601 date strings
 * (YYYY-MM-DD format), which compare lexicographically — i.e. correctly.
 * The `scheduledDate` field has a database index for query performance.
 *
 * All read queries include ACTIVE_FILTER so soft-deleted logs are invisible
 * to the application layer.
 */
export class MongooseMedicineLogsRepository implements IMedicineLogsRepository {
  async create(log: MedicineLog): Promise<MedicineLog> {
    await MedicineLogModel.create(log);
    return log;
  }

  /** Returns a medicine log only if it has NOT been soft-deleted. */
  async findById(id: string): Promise<MedicineLog | null> {
    const doc = await MedicineLogModel.findOne({ id, ...ACTIVE_FILTER })
      .select('-_id -__v')
      .lean<MedicineLog>();
    return doc ?? null;
  }

  async update(id: string, partialLog: Partial<MedicineLog>): Promise<MedicineLog | null> {
    const doc = await MedicineLogModel.findOneAndUpdate(
      { id, ...ACTIVE_FILTER },
      { $set: { ...partialLog, updatedAt: new Date().toISOString() } },
      { new: true },
    )
      .select('-_id -__v')
      .lean<MedicineLog>();
    return doc ?? null;
  }

  /** Returns only active (non-deleted) logs for the given elderly user. */
  async findByElderlyId(elderlyId: string): Promise<MedicineLog[]> {
    return MedicineLogModel.find({ elderlyId, ...ACTIVE_FILTER })
      .select('-_id -__v')
      .lean<MedicineLog[]>();
  }

  /** Returns only active (non-deleted) logs within the given date range. */
  async findLogsByDateRange(
    elderlyId: string,
    startDate: string,
    endDate: string,
  ): Promise<MedicineLog[]> {
    return MedicineLogModel.find({
      elderlyId,
      ...ACTIVE_FILTER,
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .select('-_id -__v')
      .lean<MedicineLog[]>();
  }
}
