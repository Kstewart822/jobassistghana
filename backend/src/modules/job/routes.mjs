/**
 * Job Routes - API endpoints for job management
 */
import { Router } from 'express';
import jobController from './controller.mjs';
import { authenticate } from '../../middleware/authentication.mjs';
import rbac from '../../middleware/rbac.mjs';

const router = Router();

// Public routes
router.get('/', jobController.listJobs); // List all active jobs
router.get('/search', jobController.searchJobs); // Search jobs
router.get('/:jobId', jobController.getJobById); // Get single job
router.get('/employer/:employerId', jobController.getJobsByEmployer); // Get jobs by employer

// Protected routes (employer/admin only)
router.post('/', authenticate, rbac.requireRole('employer', 'admin'), jobController.createJob); // Create job
router.put('/:jobId', authenticate, rbac.requireRole('employer', 'admin'), jobController.updateJob); // Update job
router.post('/:jobId/publish', authenticate, rbac.requireRole('employer', 'admin'), jobController.publishJob); // Publish job
router.post('/:jobId/close', authenticate, rbac.requireRole('employer', 'admin'), jobController.closeJob); // Close job
router.delete('/:jobId', authenticate, rbac.requireRole('employer', 'admin'), jobController.deleteJob); // Delete job

export default router;
