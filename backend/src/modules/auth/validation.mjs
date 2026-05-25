/**
 * Auth Module - Validation
 */
import { validateEmail, validatePassword } from '../../validators/index.mjs';

export const validateInput = {
  register: (req, res, next) => {
    const { email, password, confirmPassword, name, role } = req.body;

    const errors = {};

    if (!email || !validateEmail(email)) {
      errors.email = 'Valid email is required';
    }

    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!password || !validatePassword(password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!role || !['candidate', 'employer'].includes(role)) {
      errors.role = 'Invalid role';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  },

  login: (req, res, next) => {
    const { email, password } = req.body;

    const errors = {};

    if (!email) {
      errors.email = 'Email is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  },

  forgotPassword: (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        errors: { email: 'Email is required' } 
      });
    }

    next();
  },

  resetPassword: (req, res, next) => {
    const { token, newPassword, confirmPassword } = req.body;

    const errors = {};

    if (!token) {
      errors.token = 'Reset token is required';
    }

    if (!newPassword || !validatePassword(newPassword)) {
      errors.newPassword = 'Valid password is required';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  },
};
