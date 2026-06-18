/**
 * Job Service - Business logic for job management
 */
import Job from '../../models/Job.mjs';
import { User } from '../../models/User.mjs';
import { default as EmployerProfileModel } from '../../models/EmployerProfile.mjs';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} from "../../lib/errors.mjs";
import logger from "../../utils/logger.mjs";
import BaseService from '../../lib/baseService.mjs';

class JobService extends BaseService {
  constructor() {
    super(Job);
  }

  /**
   * List all active jobs with pagination
   */
  async listJobs(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category = null,
        location = null,
        jobType = null,
      } = { ...pagination, ...filters };

      const skip = (page - 1) * limit;

      // Build query
      const query = { status: "active", deletedAt: null };

      if (category) query.category = category;
      if (jobType) query.jobType = jobType;
      if (location) {
        // Partial location matching
        query.location = { $regex: location, $options: "i" };
      }

      // Execute query with pagination
      const jobs = await Job.find(query)
        .populate("employerId", "name email profile")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Get total count for pagination
      const total = await Job.countDocuments(query);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Failed to list jobs", { error: error.message });
      throw error;
    }
  }

  /**
   * Get single job by ID
   */
  async getJobById(jobId) {
    try {
      const job = await Job.findById(jobId)
        .populate("employerId", "name email profile")
        .populate("employerProfileId", "company industry");

      if (!job || job.deletedAt) {
        throw new NotFoundError("Job");
      }

      // Increment view count
      job.viewCount = (job.viewCount || 0) + 1;
      await job.save();

      return job;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error("Failed to get job", { error: error.message, jobId });
      throw error;
    }
  }

  /**
   * Search jobs using full-text search or filters
   */
  async searchJobs(searchQuery, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build query with text search
      const query = { status: "active", deletedAt: null };

      if (searchQuery) {
        query.$text = { $search: searchQuery };
      }

      // Apply additional filters
      if (filters.category) query.category = filters.category;
      if (filters.jobType) query.jobType = filters.jobType;
      if (filters.minSalary) query.salaryMin = { $gte: filters.minSalary };
      if (filters.maxSalary) query.salaryMax = { $lte: filters.maxSalary };
      if (filters.location) {
        query.location = { $regex: filters.location, $options: "i" };
      }

      // Execute search
      const jobs = await Job.find(
        query,
        { score: { $meta: "textScore" } }, // Get relevance score
      )
        .populate("employerId", "name email profile")
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count
      const total = await Job.countDocuments(query);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Job search failed", { error: error.message, searchQuery });
      throw error;
    }
  }

  /**
   * Create new job posting
   */
  async createJob(employerId, jobData) {
    try {
      // Validate required fields
      if (
        !jobData.title ||
        !jobData.description ||
        !jobData.category ||
        !jobData.location
      ) {
        throw new ValidationError("Missing required job fields");
      }

      // Get or create employer profile
      let employerProfile = await EmployerProfileModel.findOne({ userId: employerId });
      if (!employerProfile) {
        // Create a default employer profile
        employerProfile = new EmployerProfileModel({
          userId: employerId,
          companyName: 'Job Posting Company',
          description: 'Default employer profile',
          logo: null,
          industry: 'Technology',
        });
        await employerProfile.save();
      }

      // Map jobType from lowercase to capitalized enum
      const jobTypeMap = {
        'full-time': 'Full-time',
        'part-time': 'Part-time',
        'contract': 'Contract',
        'temporary': 'Temporary',
        'internship': 'Freelance', // Map internship to Freelance since model doesn't have internship
      };

      // Parse location - if it's a string, split it or use sensible defaults
      let locationObj = { country: 'Ghana', city: 'Accra' };
      if (typeof jobData.location === 'string') {
        const parts = jobData.location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          locationObj.city = parts[0];
          locationObj.country = parts[parts.length - 1];
        } else if (parts.length === 1) {
          locationObj.city = parts[0];
        }
      } else if (typeof jobData.location === 'object') {
        locationObj = { ...locationObj, ...jobData.location };
      }

      // Map workMode/remote
      const remoteMap = {
        'on-site': 'On-site',
        'remote': 'Remote',
        'hybrid': 'Hybrid',
      };
      const remote = remoteMap[jobData.workMode] || 'On-site';

      // Determine experience level from request or default
      const experienceLevel = jobData.experience || 'Mid';

      // Create job with all required fields
      const job = new Job({
        employerId,
        employerProfileId: employerProfile._id,
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        location: {
          country: locationObj.country || 'Ghana',
          city: locationObj.city || 'Accra',
          state: locationObj.state,
          remote,
          // Only include coordinates if we have them
          ...(locationObj.coordinates && {
            coordinates: {
              type: 'Point',
              coordinates: locationObj.coordinates,
            },
          }),
        },
        jobType: jobTypeMap[jobData.jobType] || 'Full-time',
        experienceLevel,
        ...(jobData.salaryMin && { salary: { min: jobData.salaryMin } }),
        ...(jobData.salaryMax && {
          salary: {
            ...(jobData.salaryMin && { min: jobData.salaryMin }),
            max: jobData.salaryMax,
          },
        }),
        status: "draft",
        slug: this.generateSlug(jobData.title),
      });

      await job.save();

      logger.info("Job created", { jobId: job._id, employerId });

      return job;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error("Failed to create job", {
        error: error.message,
        employerId,
      });
      throw error;
    }
  }

  /**
   * Update job (only by employer who owns it)
   */
  async updateJob(jobId, employerId, updateData) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        throw new NotFoundError("Job");
      }

      // Verify ownership
      if (job.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError("Cannot update job you do not own");
      }

      // Prevent updating certain fields
      const protectedFields = ["employerId", "applicationCount", "slug"];
      protectedFields.forEach((field) => delete updateData[field]);

      // Update allowed fields
      Object.assign(job, updateData);

      // If title changed, update slug
      if (updateData.title) {
        job.slug = this.generateSlug(updateData.title);
      }

      await job.save();

      logger.info("Job updated", { jobId, employerId });

      return job;
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError)) throw error;
      logger.error("Failed to update job", { error: error.message, jobId });
      throw error;
    }
  }

  /**
   * Publish job (change status from draft to active)
   */
  async publishJob(jobId, employerId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        throw new NotFoundError("Job");
      }

      // Verify ownership
      if (job.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError("Cannot publish job you do not own");
      }

      if (job.status !== "draft") {
        throw new ValidationError("Only draft jobs can be published");
      }

      job.status = "active";
      job.publishedAt = new Date();
      await job.save();

      logger.info("Job published", { jobId, employerId });

      return job;
    } catch (error) {
      if (
        error instanceof
        (NotFoundError || AuthorizationError || ValidationError)
      )
        throw error;
      logger.error("Failed to publish job", {
        error: error.message,
        jobId,
      });
      throw error;
    }
  }

  /**
   * Close job (stop accepting applications)
   */
  async closeJob(jobId, employerId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        throw new NotFoundError("Job");
      }

      // Verify ownership
      if (job.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError("Cannot close job you do not own");
      }

      job.status = "closed";
      job.closedAt = new Date();
      await job.save();

      logger.info("Job closed", { jobId, employerId });

      return job;
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError)) throw error;
      logger.error("Failed to close job", {
        error: error.message,
        jobId,
      });
      throw error;
    }
  }

  /**
   * Delete job (soft delete)
   */
  async deleteJob(jobId, employerId) {
    try {
      const job = await Job.findById(jobId);

      if (!job) {
        throw new NotFoundError("Job");
      }

      // Verify ownership
      if (job.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError("Cannot delete job you do not own");
      }

      // Soft delete
      job.deletedAt = new Date();
      await job.save();

      logger.info("Job deleted", { jobId, employerId });

      return { message: "Job deleted successfully" };
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError)) throw error;
      logger.error("Failed to delete job", {
        error: error.message,
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get jobs by employer
   */
  async getJobsByEmployer(employerId, filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = null,
      } = {
        ...pagination,
        ...filters,
      };
      const skip = (page - 1) * limit;

      const query = { employerId, deletedAt: null };
      if (status) query.status = status;

      const jobs = await Job.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Job.countDocuments(query);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Failed to get employer jobs", {
        error: error.message,
        employerId,
      });
      throw error;
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title) {
    return (
      title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special chars
        .replace(/\s+/g, "-") // Replace spaces with dashes
        .replace(/-+/g, "-") // Replace multiple dashes with single dash
        .substring(0, 50) + // Limit length
      `-${Date.now()}`
    ); // Add timestamp for uniqueness
  }
}

export default new JobService();
