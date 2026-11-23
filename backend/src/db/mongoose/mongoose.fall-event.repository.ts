import type { FallEvent } from '../../fall-detection/fall-detection.types';
import type { IFallEventRepository } from '../fall-event.repository';
import { FallEventModel } from './fall-event.model';

export class MongooseFallEventRepository implements IFallEventRepository {
  async create(event: FallEvent): Promise<FallEvent> {
    await FallEventModel.create(event);
    return event;
  }

  async findById(id: string): Promise<FallEvent | undefined> {
    const doc = await FallEventModel.findOne({ id })
      .select('-_id -__v')
      .lean<FallEvent>();
    return doc ?? undefined;
  }

  async findByPatientId(patientId: string): Promise<FallEvent[]> {
    const docs = await FallEventModel.find({ patient_id: patientId })
      .sort({ created_at: -1 })
      .select('-_id -__v')
      .lean<FallEvent[]>();
    return docs;
  }

  async findByPatientIds(patientIds: string[]): Promise<FallEvent[]> {
    if (patientIds.length === 0) return [];
    const docs = await FallEventModel.find({ patient_id: { $in: patientIds } })
      .sort({ created_at: -1 })
      .select('-_id -__v')
      .lean<FallEvent[]>();
    return docs;
  }

  async update(id: string, updates: Partial<FallEvent>): Promise<FallEvent | undefined> {
    const doc = await FallEventModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    )
      .select('-_id -__v')
      .lean<FallEvent>();
    return doc ?? undefined;
  }

  async findRecentDuplicate(patientId: string, windowMs: number = 10000): Promise<FallEvent | undefined> {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const doc = await FallEventModel.findOne({
      patient_id: patientId,
      created_at: { $gte: cutoff },
      status: { $in: ['suspected', 'awaiting_response', 'acknowledged'] },
    })
      .select('-_id -__v')
      .lean<FallEvent>();
    return doc ?? undefined;
  }
}
