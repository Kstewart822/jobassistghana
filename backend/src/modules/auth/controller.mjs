/**
 * Auth Module - Controller
 */
import * as service from './service.mjs';
import logger from '../../utils/logger.mjs';

export async function register(req, res, next) {
  try {
    const result = await service.register(req.body);
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      data: result 
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await service.login(req.body);
    res.json({ 
      success: true, 
      message: 'Login successful',
      data: result 
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const result = await service.refreshToken(req.body.refreshToken);
    res.json({ 
      success: true, 
      message: 'Token refreshed',
      data: result 
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await service.logout(req.user.id);
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await service.forgotPassword(req.body.email);
    res.json({ 
      success: true, 
      message: 'Password reset link sent to email' 
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await service.resetPassword(req.body.token, req.body.newPassword);
    res.json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    await service.changePassword(req.user.id, req.body);
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
}
