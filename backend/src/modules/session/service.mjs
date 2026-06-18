/**
 * Session Module - Service
 * Manages server-side session storage in MongoDB
 */
import { getDatabase } from '../../database/connection.mjs';
import { AppError } from '../../lib/errors.mjs';
import logger from '../../utils/logger.mjs';

export async function createSession(userId, userEmail, userRole, accessToken, refreshToken, userAgent, ipAddress) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const session = {
      userId: userId.toString(),
      email: userEmail,
      role: userRole,
      accessToken,
      refreshToken,
      userAgent,
      ipAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const result = await sessionsCollection.insertOne(session);

    logger.info('Session created', { sessionId: result.insertedId, userId });

    return {
      sessionId: result.insertedId,
      ...session,
    };
  } catch (error) {
    logger.error('Create session error:', error);
    throw error;
  }
}

export async function getSession(sessionId) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const session = await sessionsCollection.findOne({
      _id: sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new AppError('Session not found or expired', 401);
    }

    return session;
  } catch (error) {
    logger.error('Get session error:', error);
    throw error;
  }
}

export async function updateSessionActivity(sessionId) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const result = await sessionsCollection.updateOne(
      { _id: sessionId },
      {
        $set: {
          lastActivity: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Update session activity error:', error);
    throw error;
  }
}

export async function invalidateSession(sessionId) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const result = await sessionsCollection.updateOne(
      { _id: sessionId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );

    logger.info('Session invalidated', { sessionId });

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Invalidate session error:', error);
    throw error;
  }
}

export async function invalidateAllUserSessions(userId) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const result = await sessionsCollection.updateMany(
      { userId: userId.toString() },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );

    logger.info('All user sessions invalidated', { userId });

    return result.modifiedCount;
  } catch (error) {
    logger.error('Invalidate all sessions error:', error);
    throw error;
  }
}

export async function getUserActiveSessions(userId) {
  try {
    const db = getDatabase();
    const sessionsCollection = db.collection('sessions');

    const sessions = await sessionsCollection
      .find({
        userId: userId.toString(),
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .toArray();

    return sessions;
  } catch (error) {
    logger.error('Get user sessions error:', error);
    throw error;
  }
}
