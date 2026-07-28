import type { MedicineLog } from '../../medicine-logs/medicine-logs.types.js';
import type { IMedicineLogsRepository } from '../medicine-logs.repository.js';
import { MedicineLogModel } from './medicine-log.model.js';

/**
 * MongooseMedicineLogsRepository — persists MedicineLogs in MongoDB.
 *
 * Implements IMedicineLogsRepository as a drop-in for the removed
 * MemoryMedicineLogsRepository.
 *
 * Date-range queries use MongoDB's $gte / $lte on ISO 8601 date strings
 * (YYYY-MM-DD format), which compare lexicographically — i.e. correctly.
 * The `scheduledDate` field has a database index for query performance.
 *
 * `.select('-_id -__v').lean<T>()` strips Mongoose internals and returns a
 * plain object that exactly matches the domain type.
 */
export class MongooseMedicineLogsRepository implements IMedicineLogsRepository {
  async create(log: MedicineLog): Promise<MedicineLog> {
    await MedicineLogModel.create(log);
    return log;
  }

  async findById(id: string): Promise<MedicineLog | null> {
    const doc = await MedicineLogModel.findOne({ id })
      .select('-_id -__v')
      .lean<MedicineLog>();
    return doc ?? null;
  }

  async update(id: string, partialLog: Partial<MedicineLog>): Promise<MedicineLog | null> {
    const doc = await MedicineLogModel.findOneAndUpdate(
      { id },
      { $set: { ...partialLog, updatedAt: new Date().toISOString() } },
      { new: true }
    )
      .select('-_id -__v')
      .lean<MedicineLog>();
    return doc ?? null;
  }

  async findByElderlyId(elderlyId: string): Promise<MedicineLog[]> {
    return MedicineLogModel.find({ elderlyId })
      .select('-_id -__v')
      .lean<MedicineLog[]>();
  }

  async findLogsByDateRange(
    elderlyId: string,
    startDate: string,
    endDate: string
  ): Promise<MedicineLog[]> {
    return MedicineLogModel.find({
      elderlyId,
      scheduledDate: { $gte: startDate, $lte: endDate },
    })
      .select('-_id -__v')
      .lean<MedicineLog[]>();
  }
}
