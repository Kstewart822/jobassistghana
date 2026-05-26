/**
 * Job Controller - HTTP request handlers for job operations
 */
import jobService from './service.mjs';
import { responseHandler } from '../../utils/responseHandler.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';
import { jobSchemas } from '../../schemas/jobSchemas.mjs';
import logger from '../../utils/logger.mjs';

class JobController {
  /**
   * List all active jobs
   * GET /api/jobs
   * Query: page, limit, category, location, jobType
   */
  listJobs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category, location, jobType } = req.query;

    const result = await jobService.listJobs(
      { category, location, jobType },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    logger.info('Jobs listed', {
      total: result.pagination.total,
      page,
      limit,
    });

    return responseHandler.paginated(
      res,
      result.jobs,
      result.pagination,
      'Jobs retrieved successfully'
    );
  });

  /**
   * Search jobs
   * GET /api/jobs/search
   * Query: q (search query), category, jobType, minSalary, maxSalary, location, page, limit
   */
  searchJobs = asyncHandler(async (req, res) => {
    const {
      q = '',
      category,
      jobType,
      minSalary,
      maxSalary,
      location,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await jobService.searchJobs(
      q,
      { category, jobType, minSalary, maxSalary, location },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    logger.info('Jobs searched', {
      query: q,
      total: result.pagination.total,
      page,
    });

    return responseHandler.paginated(
      res,
      result.jobs,
      result.pagination,
      'Search results retrieved successfully'
    );
  });

  /**
   * Get single job by ID
   * GET /api/jobs/:jobId
   */
  getJobById = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await jobService.getJobById(jobId);

    logger.info('Job retrieved', { jobId });

    return responseHandler.success(res, job, 'Job retrieved successfully');
  });

  /**
   * Create new job posting
   * POST /api/jobs
   * Requires: authenticated, employer role
   * Body: title, description, category, location, jobType, salaryMin, salaryMax, skillsRequired, customQuestions
   */
  createJob = asyncHandler(async (req, res) => {
    const employerId = req.user.id;

    // Validate request body
    const validation = jobSchemas.create.safeParse(req.body);
    if (!validation.success) {
      return responseHandler.error(
        res,
        validation.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const job = await jobService.createJob(employerId, validation.data);

    logger.info('Job created', { jobId: job._id, employerId });

    return responseHandler.created(res, job, 'Job created successfully');
  });

  /**
   * Update job
   * PUT /api/jobs/:jobId
   * Requires: authenticated, employer who owns the job
   * Body: Partial job update fields
   */
  updateJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const employerId = req.user.id;

    // Validate partial update
    const validation = jobSchemas.update.safeParse(req.body);
    if (!validation.success) {
      return responseHandler.error(
        res,
        validation.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const job = await jobService.updateJob(
      jobId,
      employerId,
      validation.data
    );

    logger.info('Job updated', { jobId, employerId });

    return responseHandler.success(res, job, 'Job updated successfully');
  });

  /**
   * Publish job (draft -> active)
   * POST /api/jobs/:jobId/publish
   * Requires: authenticated, employer who owns the job
   */
  publishJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const employerId = req.user.id;

    const job = await jobService.publishJob(jobId, employerId);

    logger.info('Job published', { jobId, employerId });

    return responseHandler.success(res, job, 'Job published successfully');
  });

  /**
   * Close job (active -> closed)
   * POST /api/jobs/:jobId/close
   * Requires: authenticated, employer who owns the job
   */
  closeJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const employerId = req.user.id;

    const job = await jobService.closeJob(jobId, employerId);

    logger.info('Job closed', { jobId, employerId });

    return responseHandler.success(res, job, 'Job closed successfully');
  });

  /**
   * Delete job (soft delete)
   * DELETE /api/jobs/:jobId
   * Requires: authenticated, employer who owns the job
   */
  deleteJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const employerId = req.user.id;

    const result = await jobService.deleteJob(jobId, employerId);

    logger.info('Job deleted', { jobId, employerId });

    return responseHandler.success(res, null, result.message);
  });

  /**
   * Get jobs by employer
   * GET /api/jobs/employer/:employerId
   * Query: status (optional), page, limit
   */
  getJobsByEmployer = asyncHandler(async (req, res) => {
    const { employerId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const result = await jobService.getJobsByEmployer(
      employerId,
      { status },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    logger.info('Employer jobs retrieved', {
      employerId,
      total: result.pagination.total,
    });

    return responseHandler.paginated(
      res,
      result.jobs,
      result.pagination,
      'Employer jobs retrieved successfully'
    );
  });
}

export default new JobController();
