/**
 * Token Service - JWT token generation and verification
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/environment.mjs';
import logger from '../utils/logger.mjs';

class TokenService {
  /**
   * Generate access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user._id,
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      logger.warn('Access token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      logger.warn('Refresh token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
}

export const tokenService = new TokenService();

export default tokenService;
