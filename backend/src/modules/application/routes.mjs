/**
 * Application Routes - API endpoints for job applications
 */
import { Router } from 'express';
import applicationController from './controller.mjs';
import { authenticate } from '../../middleware/authentication.mjs';
import rbac from '../../middleware/rbac.mjs';

const router = Router();

// Protected routes - all require authentication
router.use(authenticate);

// Candidate routes
router.post('/', rbac.requireRole('candidate'), applicationController.submitApplication); // Submit application
router.get('/me', rbac.requireRole('candidate'), applicationController.getMyApplications); // Get my applications
router.post('/:applicationId/withdraw', rbac.requireRole('candidate'), applicationController.withdrawApplication); // Withdraw application
router.post('/:applicationId/documents', rbac.requireRole('candidate'), applicationController.addDocument); // Add document
router.get('/:applicationId/documents', applicationController.getDocuments); // Get documents

// Employer routes
router.get('/employer', rbac.requireRole('employer', 'admin'), applicationController.getEmployerApplications); // Get employer applications
router.patch('/:applicationId/status', rbac.requireRole('employer', 'admin'), applicationController.updateStatus); // Update status
router.post('/:applicationId/interview', rbac.requireRole('employer', 'admin'), applicationController.scheduleInterview); // Schedule interview

// General routes
router.get('/:applicationId', applicationController.getApplication); // Get single application
router.delete('/:applicationId', applicationController.deleteApplication); // Delete application

export default router;
