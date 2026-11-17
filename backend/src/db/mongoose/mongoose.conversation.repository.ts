import { randomUUID } from 'crypto';
import type { ConversationSession, StoredMessage } from '../../ai/ai.types';
import type { IConversationRepository } from '../conversation.repository';
import { ConversationSessionModel } from './conversation.model';

/**
 * MongooseConversationRepository — persists ConversationSessions in MongoDB.
 *
 * ID strategy: Option A — app-level UUIDs stored as a plain `id` string field.
 * MongoDB's native `_id` is never exposed to the service layer.
 */
export class MongooseConversationRepository implements IConversationRepository {
  async createSession(
    userId: string,
    patientId: string,
    title: string,
  ): Promise<ConversationSession> {
    const now = new Date().toISOString();
    const session: ConversationSession = {
      id: randomUUID(),
      userId,
      patientId,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    await ConversationSessionModel.create(session);
    return session;
  }

  async appendMessages(sessionId: string, messages: StoredMessage[]): Promise<void> {
    await ConversationSessionModel.updateOne(
      { id: sessionId },
      {
        $push: { messages: { $each: messages } },
        $set:  { updatedAt: new Date().toISOString() },
      },
    );
  }

  async getSession(sessionId: string): Promise<ConversationSession | undefined> {
    const doc = await ConversationSessionModel
      .findOne({ id: sessionId })
      .select('-_id -__v')
      .lean<ConversationSession>();
    return doc ?? undefined;
  }

  async listSessionsByUser(userId: string): Promise<ConversationSession[]> {
    return ConversationSessionModel
      .find({ userId })
      .select('-_id -__v')
      .sort({ createdAt: -1 })
      .lean<ConversationSession[]>();
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await ConversationSessionModel.updateOne(
      { id: sessionId },
      {
        $set: {
          title,
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await ConversationSessionModel.deleteOne({ id: sessionId });
  }
}

