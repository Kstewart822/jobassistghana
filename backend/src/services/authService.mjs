/**
 * Authentication Service
 * Handles user registration, login, password management, etc.
 */
import { User } from '../models/User.mjs';
import BaseService from '../lib/baseService.mjs';
import { tokenService } from './tokenService.mjs';
import { config } from '../config/environment.mjs';
import logger from '../utils/logger.mjs';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../lib/errors.mjs';

export class AuthService extends BaseService {
  constructor() {
    super(User, 'User');
  }

  /**
   * Register new user
   */
  async register(data) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create new user
      const user = new User({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role || 'candidate',
        status: 'active', // Set to active immediately; email verification is separate
      });

      await user.save();

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      // Generate tokens for immediate login after registration
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken(user);

      return {
        user: this.formatUserResponse(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      logger.error('Registration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Find user and include password
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw new AuthenticationError('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        await user.incLoginAttempts();
        throw new AuthenticationError('Invalid email or password');
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info('User logged in', {
        userId: user._id,
        email: user.email,
      });

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken(user);

      return {
        user: this.formatUserResponse(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Login failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = tokenService.verifyRefreshToken(refreshToken);

      if (!decoded) {
        throw new AuthenticationError('Invalid refresh token');
      }

      const user = await User.findById(decoded.userId);

      if (!user || user.status !== 'active') {
        throw new AuthenticationError('User not found or inactive');
      }

      const newAccessToken = tokenService.generateAccessToken(user);
      const newRefreshToken = tokenService.generateRefreshToken(user);

      return {
        user: this.formatUserResponse(user),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Token refresh failed', { error: error.message });
      throw new AuthenticationError('Token refresh failed');
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new NotFoundError('User');
      }

      if (!user.password) {
        logger.error('User password not found', { userId, hasPassword: !!user.password });
        throw new AuthenticationError('User password field missing');
      }

      // Verify old password
      const isPasswordValid = await user.comparePassword(oldPassword);

      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info('Password changed', { userId });

      return {
        message: 'Password changed successfully',
      };
    } catch (error) {
      if (error instanceof (AuthenticationError || NotFoundError)) throw error;
      logger.error('Password change failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if email exists
        logger.warn('Password reset requested for non-existent email', { email });
        return {
          message: 'If this email exists in our system, a password reset link has been sent.',
        };
      }

      // Generate reset token (6 digits + timestamp hash)
      const resetToken = Math.random().toString(36).slice(2, 8).toUpperCase();
      const resetTokenHash = await require('crypto').createHash('sha256').update(resetToken).digest('hex');

      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

      logger.info('Password reset requested', { userId: user._id, email });

      // TODO: Send email with reset token
      // await sendPasswordResetEmail(user.email, resetToken);

      return {
        message: 'If this email exists in our system, a password reset link has been sent.',
        resetToken: resetToken, // In production, send via email only
      };
    } catch (error) {
      logger.error('Password reset request failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const crypto = await import('crypto');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      const user = await User.findOne({
        passwordResetToken: resetTokenHash,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info('Password reset successfully', { userId: user._id });

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(verificationToken) {
    try {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

      const user = await User.findOne({
        emailVerificationToken: tokenHash,
        emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new AuthenticationError('Invalid or expired verification token');
      }

      user.emailVerified = true;
      user.status = 'active';
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.info('Email verified', { userId: user._id });

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error('Email verification failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User');
      }

      return this.formatUserResponse(user);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get user profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { profile: data },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError('User');
      }

      logger.info('User profile updated', { userId });

      return this.formatUserResponse(user);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to update profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Format user response (remove sensitive fields)
   */
  formatUserResponse(user) {
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      profile: user.profile,
      permissions: user.permissions,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();

export default authService;
