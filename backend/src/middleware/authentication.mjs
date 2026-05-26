import { AuthenticationError } from '../lib/errors.mjs';
import tokenService from '../services/tokenService.mjs';
import logger from '../utils/logger.mjs';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * Usage: router.get('/protected', authenticate, controller)
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);

    if (!decoded) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      path: req.path,
      error: error.message,
      ip: req.ip,
    });

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
        statusCode: 401,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      errorCode: 'AUTH_FAILED',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if token is missing
 * Useful for endpoints that have different behavior for authenticated vs unauthenticated users
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue as unauthenticated
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = tokenService.verifyAccessToken(token);

    if (decoded) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };
    }
  } catch (error) {
    logger.debug('Optional authentication skipped', { error: error.message });
  }

  next();
};

/**
 * Check if user is authenticated (boolean utility)
 */
export const isAuthenticated = (req) => {
  return !!req.user && !!req.user.id;
};

/**
 * Extract user from request safely
 */
export const getCurrentUser = (req) => {
  return req.user || null;
};
