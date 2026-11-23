import type { FallEvent } from '../fall-detection/fall-detection.types';

export interface IFallEventRepository {
  create(event: FallEvent): Promise<FallEvent>;
  findById(id: string): Promise<FallEvent | undefined>;
  findByPatientId(patientId: string): Promise<FallEvent[]>;
  findByPatientIds(patientIds: string[]): Promise<FallEvent[]>;
  update(id: string, updates: Partial<FallEvent>): Promise<FallEvent | undefined>;
  findRecentDuplicate(patientId: string, windowMs?: number): Promise<FallEvent | undefined>;
}
