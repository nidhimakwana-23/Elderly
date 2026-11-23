import type { FallNotification } from '../fall-detection/fall-detection.types';

export interface IFallNotificationRepository {
  create(notification: FallNotification): Promise<FallNotification>;
  createMany(notifications: FallNotification[]): Promise<FallNotification[]>;
  findByRecipientId(recipientId: string): Promise<FallNotification[]>;
  markAsRead(id: string, recipientId: string): Promise<FallNotification | undefined>;
  findByEventId(eventId: string): Promise<FallNotification[]>;
}
