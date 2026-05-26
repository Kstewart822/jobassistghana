/**
 * Application Controller - HTTP request handlers for applications
 */
import applicationService from './service.mjs';
import { responseHandler } from '../../utils/responseHandler.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import { applicationSchemas } from '../../schemas/applicationSchemas.mjs';
import logger from '../../utils/logger.mjs';

class ApplicationController {
  /**
   * Submit job application
   * POST /api/applications
   * Requires: authenticated, candidate role
   * Body: jobId, coverLetter (optional)
   */
  submitApplication = asyncHandler(async (req, res) => {
    const candidateId = req.user.id;
    const { jobId, coverLetter } = req.body;

    // Validate
    if (!jobId) {
      return responseHandler.error(
        res,
        'Job ID is required',
        400,
        'MISSING_JOB_ID'
      );
    }

    const application = await applicationService.submitApplication(
      candidateId,
      jobId,
      { coverLetter }
    );

    logger.info('Application submitted successfully', {
      applicationId: application._id,
      candidateId,
    });

    return responseHandler.created(
      res,
      application,
      'Application submitted successfully'
    );
  });

  /**
   * Get candidate's applications
   * GET /api/applications/me
   * Requires: authenticated
   * Query: status, page, limit
   */
  getMyApplications = asyncHandler(async (req, res) => {
    const candidateId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const result = await applicationService.getApplicationsByCandidate(
      candidateId,
      { status },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    logger.info('Candidate applications retrieved', {
      candidateId,
      total: result.pagination.total,
    });

    return responseHandler.paginated(
      res,
      result.applications,
      result.pagination,
      'Applications retrieved successfully'
    );
  });

  /**
   * Get employer's applications (for their jobs)
   * GET /api/applications/employer
   * Requires: authenticated, employer role
   * Query: status, jobId, page, limit
   */
  getEmployerApplications = asyncHandler(async (req, res) => {
    const employerId = req.user.id;
    const { status, jobId, page = 1, limit = 10 } = req.query;

    const result = await applicationService.getApplicationsByEmployer(
      employerId,
      { status, jobId },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    logger.info('Employer applications retrieved', {
      employerId,
      total: result.pagination.total,
    });

    return responseHandler.paginated(
      res,
      result.applications,
      result.pagination,
      'Applications retrieved successfully'
    );
  });

  /**
   * Get single application
   * GET /api/applications/:applicationId
   * Requires: authenticated (candidate or employer of job)
   */
  getApplication = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await applicationService.getApplicationById(
      applicationId
    );

    // Verify access (candidate or employer only)
    const isCandidate =
      application.candidateId._id.toString() === userId.toString();
    const isEmployer =
      application.employerId._id.toString() === userId.toString();

    if (!isCandidate && !isEmployer) {
      return responseHandler.error(
        res,
        'You do not have access to this application',
        403,
        'ACCESS_DENIED'
      );
    }

    logger.info('Application retrieved', { applicationId, userId });

    return responseHandler.success(
      res,
      application,
      'Application retrieved successfully'
    );
  });

  /**
   * Update application status
   * PATCH /api/applications/:applicationId/status
   * Requires: authenticated, employer who owns the job
   * Body: status
   */
  updateStatus = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const employerId = req.user.id;
    const { status } = req.body;

    if (!status) {
      return responseHandler.error(
        res,
        'Status is required',
        400,
        'MISSING_STATUS'
      );
    }

    const application = await applicationService.updateApplicationStatus(
      applicationId,
      employerId,
      status
    );

    logger.info('Application status updated', {
      applicationId,
      newStatus: status,
    });

    return responseHandler.success(
      res,
      application,
      'Application status updated successfully'
    );
  });

  /**
   * Schedule interview
   * POST /api/applications/:applicationId/interview
   * Requires: authenticated, employer who owns the job
   * Body: type, scheduledDate, interviewerName, notes
   */
  scheduleInterview = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const employerId = req.user.id;
    const { type, scheduledDate, interviewerName, notes } = req.body;

    // Validate
    if (!scheduledDate) {
      return responseHandler.error(
        res,
        'Scheduled date is required',
        400,
        'MISSING_SCHEDULED_DATE'
      );
    }

    const application = await applicationService.scheduleInterview(
      applicationId,
      employerId,
      {
        type,
        scheduledDate,
        interviewerName,
        notes,
      }
    );

    logger.info('Interview scheduled', {
      applicationId,
      scheduledDate,
    });

    return responseHandler.success(
      res,
      application,
      'Interview scheduled successfully'
    );
  });

  /**
   * Withdraw application
   * POST /api/applications/:applicationId/withdraw
   * Requires: authenticated, candidate who submitted
   */
  withdrawApplication = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const candidateId = req.user.id;

    const application = await applicationService.withdrawApplication(
      applicationId,
      candidateId
    );

    logger.info('Application withdrawn', {
      applicationId,
      candidateId,
    });

    return responseHandler.success(
      res,
      application,
      'Application withdrawn successfully'
    );
  });

  /**
   * Add document to application
   * POST /api/applications/:applicationId/documents
   * Requires: authenticated, candidate who submitted
   * Form-data: file, documentType
   */
  addDocument = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const candidateId = req.user.id;
    const { documentType } = req.body;

    if (!req.file) {
      return responseHandler.error(
        res,
        'No file uploaded',
        400,
        'NO_FILE'
      );
    }

    if (!documentType) {
      return responseHandler.error(
        res,
        'Document type is required',
        400,
        'MISSING_DOCUMENT_TYPE'
      );
    }

    const document = await applicationService.addDocument(
      applicationId,
      candidateId,
      {
        documentType,
        fileUrl: `/uploads/${req.file.filename}`, // Path depends on storage strategy
      },
      req.file
    );

    logger.info('Document added', {
      applicationId,
      documentId: document._id,
      fileName: req.file.originalname,
    });

    return responseHandler.created(
      res,
      document,
      'Document added successfully'
    );
  });

  /**
   * Get application documents
   * GET /api/applications/:applicationId/documents
   * Requires: authenticated (candidate or employer of job)
   */
  getDocuments = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const documents = await applicationService.getApplicationDocuments(
      applicationId
    );

    logger.info('Application documents retrieved', {
      applicationId,
      count: documents.length,
    });

    return responseHandler.success(
      res,
      documents,
      'Documents retrieved successfully'
    );
  });

  /**
   * Delete application
   * DELETE /api/applications/:applicationId
   * Requires: authenticated (candidate or employer who can access)
   */
  deleteApplication = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await applicationService.deleteApplication(
      applicationId,
      userId,
      userRole
    );

    logger.info('Application deleted', {
      applicationId,
      userId,
    });

    return responseHandler.success(res, null, result.message);
  });
}

export default new ApplicationController();
