import type { ConversationSession, StoredMessage } from '../ai/ai.types';

/**
 * IConversationRepository — storage contract for AI conversation sessions.
 *
 * Each session is a discrete conversation thread scoped by userId + patientId.
 * Multiple sessions can exist for the same user/patient pair.
 */
export interface IConversationRepository {
  /** Create a new empty session. Title is auto-generated from the first message. */
  createSession(
    userId: string,
    patientId: string,
    title: string,
  ): Promise<ConversationSession>;

  /** Append one or more messages to an existing session. */
  appendMessages(
    sessionId: string,
    messages: StoredMessage[],
  ): Promise<void>;

  /** Fetch a single session by its ID. */
  getSession(sessionId: string): Promise<ConversationSession | undefined>;

  /** List all sessions for a given user, newest first. */
  listSessionsByUser(userId: string): Promise<ConversationSession[]>;

  /** Update session title. */
  updateSessionTitle(sessionId: string, title: string): Promise<void>;

  /** Delete a session by its ID (owner check is the caller's responsibility). */
  deleteSession(sessionId: string): Promise<void>;
}

