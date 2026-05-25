/**
 * Auth Module - Routes
 */
import { Router } from 'express';
import * as controller from './controller.mjs';
import { validateInput } from './validation.mjs';

const router = Router();

// Public routes
router.post('/register', validateInput.register, controller.register);
router.post('/login', validateInput.login, controller.login);
router.post('/refresh-token', controller.refreshToken);
router.post('/forgot-password', validateInput.forgotPassword, controller.forgotPassword);
router.post('/reset-password', validateInput.resetPassword, controller.resetPassword);

// Protected routes
router.post('/logout', controller.logout);
router.post('/change-password', controller.changePassword);

export default router;
