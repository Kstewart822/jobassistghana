import authService from '../../services/authService.mjs';
import { asyncHandler } from '../../middleware/errorHandler.mjs';
import { responseHandler } from '../../lib/response.mjs';
import { userSchemas } from '../../lib/validation.mjs';
import logger from '../../utils/logger.mjs';

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   * Body: { email, password, confirmPassword, name, role }
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, confirmPassword, name, role } = req.body;

    // Validate request
    const validated = userSchemas.register.parse({
      email,
      password,
      confirmPassword,
      name,
      role,
    });

    // Register user
    const result = await authService.register(validated);

    logger.info('User registered successfully', {
      userId: result.user._id,
      email: result.user.email,
      role: result.user.role,
    });

    return responseHandler.created(res, result, 'User registered successfully');
  });

  /**
   * User login
   * POST /api/auth/login
   * Body: { email, password }
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate request
    const validated = userSchemas.login.parse({ email, password });

    // Authenticate user
    const result = await authService.login(validated.email, validated.password);

    logger.info('User logged in successfully', {
      userId: result.user._id,
      email: result.user.email,
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return responseHandler.success(res, result, 'Logged in successfully');
  });

  /**
   * Logout user
   * POST /api/auth/logout
   * Headers: { Authorization: Bearer accessToken }
   */
  logout = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info('User logged out', { userId });

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return responseHandler.success(res, null, 'Logged out successfully');
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh-token
   * Body or Cookie: refreshToken
   */
  refreshToken = asyncHandler(async (req, res) => {
    let refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return responseHandler.error(
        res,
        'Refresh token not provided',
        401,
        'MISSING_REFRESH_TOKEN'
      );
    }

    // Get new token pair
    const result = await authService.refreshToken(refreshToken);

    logger.info('Token refreshed', { userId: result.user._id });

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return responseHandler.success(res, result, 'Token refreshed successfully');
  });

  /**
   * Forgot password - send reset email
   * POST /api/auth/forgot-password
   * Body: { email }
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return responseHandler.error(
        res,
        'Email is required',
        400,
        'MISSING_EMAIL'
      );
    }

    // Generate reset token
    const result = await authService.forgotPassword(email);

    logger.info('Password reset email sent', { email });

    // TODO: Send email with reset token
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${result.resetToken}`;
    // await emailService.sendResetPasswordEmail(email, resetLink);

    return responseHandler.success(
      res,
      null,
      'If email exists, password reset link will be sent'
    );
  });

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   * Body: { resetToken, newPassword, confirmPassword }
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken) {
      return responseHandler.error(
        res,
        'Reset token is required',
        400,
        'MISSING_RESET_TOKEN'
      );
    }

    if (newPassword !== confirmPassword) {
      return responseHandler.error(
        res,
        'Passwords do not match',
        400,
        'PASSWORD_MISMATCH'
      );
    }

    // Reset password
    const result = await authService.resetPassword(resetToken, newPassword);

    logger.info('Password reset successfully', { userId: result._id });

    return responseHandler.success(res, null, 'Password reset successfully');
  });

  /**
   * Change password (authenticated user)
   * POST /api/auth/change-password
   * Headers: { Authorization: Bearer accessToken }
   * Body: { oldPassword, newPassword, confirmPassword }
   */
  changePassword = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return responseHandler.error(
        res,
        'Passwords do not match',
        400,
        'PASSWORD_MISMATCH'
      );
    }

    // Change password
    const result = await authService.changePassword(
      userId,
      oldPassword,
      newPassword
    );

    logger.info('Password changed successfully', { userId });

    return responseHandler.success(res, null, 'Password changed successfully');
  });

  /**
   * Verify email with token
   * POST /api/auth/verify-email
   * Body: { verificationToken }
   */
  verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.body;

    if (!verificationToken) {
      return responseHandler.error(
        res,
        'Verification token is required',
        400,
        'MISSING_VERIFICATION_TOKEN'
      );
    }

    // Verify email
    const result = await authService.verifyEmail(verificationToken);

    logger.info('Email verified successfully', { userId: result._id });

    return responseHandler.success(res, null, 'Email verified successfully');
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   * Headers: { Authorization: Bearer accessToken }
   */
  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user profile
    const user = await authService.getProfile(userId);

    return responseHandler.success(res, user, 'Profile retrieved successfully');
  });

  /**
   * Update user profile
   * PUT /api/auth/profile
   * Headers: { Authorization: Bearer accessToken }
   * Body: { name, phone, location, bio, website }
   */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;

    // Validate update data
    const validated = userSchemas.updateProfile.parse(updateData);

    // Update profile
    const result = await authService.updateProfile(userId, validated);

    logger.info('Profile updated successfully', { userId });

    return responseHandler.success(res, result, 'Profile updated successfully');
  });

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   * Body: { email }
   */
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return responseHandler.error(
        res,
        'Email is required',
        400,
        'MISSING_EMAIL'
      );
    }

    // TODO: Get user by email, generate new verification token
    // TODO: Send verification email

    logger.info('Verification email resent', { email });

    return responseHandler.success(
      res,
      null,
      'If email exists, verification email will be sent'
    );
  });

  /**
   * Get user by ID (admin only)
   * GET /api/auth/users/:userId
   * Headers: { Authorization: Bearer accessToken }
   */
  getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await authService.findById(userId);

    if (!user) {
      return responseHandler.error(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    return responseHandler.success(res, user, 'User retrieved successfully');
  });

  /**
   * List all users (admin only, paginated)
   * GET /api/auth/users?page=1&limit=10&role=candidate&status=active
   * Headers: { Authorization: Bearer accessToken }
   */
  listUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role, status } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const result = await authService.findAll(filter, options);

    return responseHandler.paginated(res, result.data, result.pagination);
  });

  /**
   * Update user status (admin only)
   * PATCH /api/auth/users/:userId/status
   * Headers: { Authorization: Bearer accessToken }
   * Body: { status }
   */
  updateUserStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'active',
      'inactive',
      'suspended',
      'verified',
      'unverified',
    ];
    if (!validStatuses.includes(status)) {
      return responseHandler.error(res, 'Invalid status', 400, 'INVALID_STATUS');
    }

    const updatedUser = await authService.update(userId, { status });

    logger.info('User status updated', { userId, newStatus: status });

    return responseHandler.success(
      res,
      updatedUser,
      'User status updated successfully'
    );
  });

  /**
   * Delete user account (admin only or user deleting own account)
   * DELETE /api/auth/users/:userId
   * Headers: { Authorization: Bearer accessToken }
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Check authorization: user can only delete own account, or admin can delete any
    if (
      requestingUser.id !== userId &&
      requestingUser.role !== 'admin'
    ) {
      return responseHandler.error(
        res,
        'Not authorized to delete this user',
        403,
        'FORBIDDEN'
      );
    }

    // Soft delete
    const deletedUser = await authService.delete(userId);

    logger.info('User deleted', { userId, deletedBy: requestingUser.id });

    return responseHandler.success(res, null, 'User deleted successfully');
  });
}

export default new AuthController();
