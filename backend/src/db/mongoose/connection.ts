import mongoose from 'mongoose';
import { logger } from '../../utils/logger';

/**
 * connectDB — establishes a single Mongoose connection.
 *
 * Call this once in server.ts before app.listen().
 * Mongoose internally pools connections, so this is safe to call once
 * and reuse across all repositories.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not set. ' +
      'Add it to your .env file (e.g. mongodb://localhost:27017/elderly).'
    );
  }
  await mongoose.connect(uri);
  logger.info('✅  MongoDB connected');
}
