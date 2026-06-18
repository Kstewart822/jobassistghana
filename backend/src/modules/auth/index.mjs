/**
 * Auth Module - Index/Exports
 */
import authRoutes from './routes.mjs';
import * as authController from './controller.mjs';
import * as authService from './service.mjs';
import * as authModel from './model.mjs';
import { validateInput } from './validation.mjs';

export default {
  routes: authRoutes,
  controller: authController,
  service: authService,
  model: authModel,
  validation: validateInput,
};
