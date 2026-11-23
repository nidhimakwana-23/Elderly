import type { FallNotification } from '../../fall-detection/fall-detection.types';
import type { IFallNotificationRepository } from '../fall-notification.repository';
import { FallNotificationModel } from './fall-notification.model';

export class MongooseFallNotificationRepository implements IFallNotificationRepository {
  async create(notification: FallNotification): Promise<FallNotification> {
    await FallNotificationModel.create(notification);
    return notification;
  }

  async createMany(notifications: FallNotification[]): Promise<FallNotification[]> {
    if (notifications.length === 0) return [];
    await FallNotificationModel.insertMany(notifications);
    return notifications;
  }

  async findByRecipientId(recipientId: string): Promise<FallNotification[]> {
    const docs = await FallNotificationModel.find({ recipient_id: recipientId })
      .sort({ created_at: -1 })
      .select('-_id -__v')
      .lean<FallNotification[]>();
    return docs;
  }

  async markAsRead(id: string, recipientId: string): Promise<FallNotification | undefined> {
    const doc = await FallNotificationModel.findOneAndUpdate(
      { id, recipient_id: recipientId },
      { $set: { status: 'read', read_at: new Date().toISOString() } },
      { new: true }
    )
      .select('-_id -__v')
      .lean<FallNotification>();
    return doc ?? undefined;
  }

  async findByEventId(eventId: string): Promise<FallNotification[]> {
    const docs = await FallNotificationModel.find({ event_id: eventId })
      .select('-_id -__v')
      .lean<FallNotification[]>();
    return docs;
  }
}
