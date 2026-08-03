import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectMongo() {
  if (!config.mongo.enabled) {
    console.log('[mongo] MONGO_ENABLED=false — running with in-memory storage only (no persistence)');
    return false;
  }

  try {
    await mongoose.connect(config.mongo.uri);
    console.log(`[mongo] connected to ${config.mongo.uri}`);
    return true;
  } catch (err) {
    console.warn('[mongo] connection failed, continuing without persistence:', err.message);
    return false;
  }
}
