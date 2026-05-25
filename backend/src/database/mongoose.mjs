/**
 * Mongoose connection setup with enhanced configuration
 */
import mongoose from 'mongoose';
import { config } from '../config/environment.mjs';
import logger from '../utils/logger.mjs';

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(config.database.url, {
      retryWrites: config.database.options.retryWrites,
      w: config.database.options.w,
      maxPoolSize: config.database.poolSize,
      serverSelectionTimeoutMS: config.database.options.serverSelectionTimeoutMS,
      socketTimeoutMS: config.database.options.socketTimeoutMS,
    });

    isConnected = true;
    logger.info('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  if (!isConnected) return;

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
}

export function isConnectedToDatabase() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getDatabase() {
  if (!isConnected) {
    throw new Error('Database not connected');
  }
  return mongoose.connection.db;
}

export default {
  connectDatabase,
  disconnectDatabase,
  isConnectedToDatabase,
  getDatabase,
};
