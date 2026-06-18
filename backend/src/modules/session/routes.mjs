/**
 * Session Module - Routes
 */
import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.mjs';
import { authenticate } from '../../middleware/authentication.mjs';
import { AppError } from '../../lib/errors.mjs';
import * as sessionService from './service.mjs';

const router = express.Router();

/**
 * GET /api/sessions/current
 * Get current session data
 * Protected: Yes (requires authentication)
 */
router.get(
  '/current',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessionId = req.sessionId;
    const session = await sessionService.getSession(sessionId);

    // Don't return sensitive tokens to frontend
    const safeSession = {
      sessionId: session._id,
      userId: session.userId,
      email: session.email,
      role: session.role,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
    };

    res.json({
      success: true,
      data: safeSession,
      message: 'Session retrieved successfully',
    });
  })
);

/**
 * GET /api/sessions/active
 * Get all active sessions for current user
 * Protected: Yes (requires authentication)
 */
router.get(
  '/active',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const sessions = await sessionService.getUserActiveSessions(userId);

    // Don't return sensitive tokens
    const safeSessions = sessions.map(session => ({
      sessionId: session._id,
      userId: session.userId,
      email: session.email,
      role: session.role,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
    }));

    res.json({
      success: true,
      data: safeSessions,
      message: 'Active sessions retrieved successfully',
    });
  })
);

/**
 * DELETE /api/sessions/current
 * Invalidate current session (logout)
 * Protected: Yes (requires authentication)
 */
router.delete(
  '/current',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessionId = req.sessionId;
    await sessionService.invalidateSession(sessionId);

    res.json({
      success: true,
      data: null,
      message: 'Session invalidated successfully',
    });
  })
);

/**
 * DELETE /api/sessions/:sessionId
 * Invalidate specific session
 * Protected: Yes (requires authentication)
 */
router.delete(
  '/:sessionId',
  authenticate,
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const userId = req.userId;

    // Verify session belongs to current user
    const session = await sessionService.getSession(sessionId);
    if (session.userId !== userId) {
      throw new AppError('Unauthorized: Cannot invalidate another user session', 403);
    }

    await sessionService.invalidateSession(sessionId);

    res.json({
      success: true,
      data: null,
      message: 'Session invalidated successfully',
    });
  })
);

/**
 * DELETE /api/sessions
 * Invalidate all sessions for current user (logout all)
 * Protected: Yes (requires authentication)
 */
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const count = await sessionService.invalidateAllUserSessions(userId);

    res.json({
      success: true,
      data: { invalidatedCount: count },
      message: `Invalidated ${count} sessions`,
    });
  })
);

export default router;
