import { MongoClient } from 'mongodb';
import { config } from '../config/environment.mjs';
import logger from '../utils/logger.mjs';

let client;
let db;

export async function connectDatabase() {
  try {
    client = new MongoClient(config.database.url, config.database.options);
    await client.connect();
    db = client.db();
    logger.info('Connected to MongoDB');
    return db;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
}

export function getClient() {
  if (!client) {
    throw new Error('MongoDB client not initialized. Call connectDatabase() first.');
  }
  return client;
}

export async function disconnectDatabase() {
  if (client) {
    await client.close();
    logger.info('Disconnected from MongoDB');
  }
}

export default { connectDatabase, getDatabase, getClient, disconnectDatabase };
