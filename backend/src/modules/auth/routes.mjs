/**
 * Auth Module - Routes
 * All authentication endpoints with RBAC and validation
 */
import { Router } from 'express';
import authController from './controller.mjs';
import { authenticate } from '../../middleware/authentication.mjs';
import { rbac } from '../../middleware/rbac.mjs';

const router = Router();

/**
 * PUBLIC ROUTES (No authentication required)
 */

// User registration
router.post('/register', authController.register);

// User login
router.post('/login', authController.login);

// Refresh access token
router.post('/refresh-token', authController.refreshToken);

// Forgot password - initiate reset flow
router.post('/forgot-password', authController.forgotPassword);

// Reset password with token
router.post('/reset-password', authController.resetPassword);

// Verify email with token
router.post('/verify-email', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', authController.resendVerification);

/**
 * PROTECTED ROUTES (Authentication required)
 */

// Logout
router.post('/logout', authenticate, authController.logout);

// Get current user profile
router.get('/profile', authenticate, authController.getProfile);

// Update current user profile
router.put('/profile', authenticate, authController.updateProfile);

// Change password
router.post('/change-password', authenticate, authController.changePassword);

/**
 * ADMIN ROUTES (Authentication + Admin role required)
 */

// List all users (paginated)
router.get(
  '/users',
  authenticate,
  rbac.adminOnly,
  authController.listUsers
);

// Get user by ID
router.get(
  '/users/:userId',
  authenticate,
  rbac.adminOnly,
  authController.getUserById
);

// Update user status
router.patch(
  '/users/:userId/status',
  authenticate,
  rbac.adminOnly,
  authController.updateUserStatus
);

// Delete user
router.delete(
  '/users/:userId',
  authenticate,
  authController.deleteUser
);

export default router;
