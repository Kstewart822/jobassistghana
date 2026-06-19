/**
 * Application Service - Business logic for job applications
 */
import Application from '../../models/Application.mjs';
import ApplicationDocument from '../../models/ApplicationDocument.mjs';
import Job from '../../models/Job.mjs';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} from '../../lib/errors.mjs';
import logger from '../../utils/logger.mjs';
import BaseService from '../../lib/baseService.mjs';

class ApplicationService extends BaseService {
  constructor() {
    super(Application);
  }

  /**
   * Submit job application
   */
  async submitApplication(candidateId, jobId, applicationData = {}) {
    try {
      // Verify job exists and is active
      const job = await Job.findById(jobId);
      if (!job || job.status !== 'active' || job.deletedAt) {
        throw new ValidationError('Job is not available for applications');
      }

      // Check for duplicate application (model pre-save hook also validates)
      const existingApp = await Application.findOne({
        candidateId,
        jobId,
        deletedAt: null,
      });
      if (existingApp) {
        throw new ConflictError('You have already applied for this job');
      }

      // Create application
      const application = new Application({
        candidateId,
        jobId,
        employerId: job.employerId,
        status: 'applied',
        stage: 'initial_screening',
        appliedAt: new Date(),
        ...applicationData,
      });

      await application.save();

      // Increment job application count
      await Job.findByIdAndUpdate(jobId, {
        $inc: { 'applicationCount.total': 1 },
      });

      logger.info('Application submitted', {
        applicationId: application._id,
        candidateId,
        jobId,
      });

      return application;
    } catch (error) {
      if (
        error instanceof (ConflictError ||
          ValidationError ||
          NotFoundError)
      )
        throw error;
      logger.error('Failed to submit application', {
        error: error.message,
        candidateId,
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get applications by candidate
   */
  async getApplicationsByCandidate(candidateId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, status = null } = {
        ...pagination,
        ...filters,
      };
      const skip = (page - 1) * limit;

      const query = { candidateId, deletedAt: null };
      if (status) query.status = status;

      const applications = await Application.find(query)
        .populate('jobId', 'title description category location salary')
        .populate('employerId', 'name email profile')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Application.countDocuments(query);

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get candidate applications', {
        error: error.message,
        candidateId,
      });
      throw error;
    }
  }

  /**
   * Get applications by employer (for their jobs)
   */
  async getApplicationsByEmployer(employerId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, status = null, jobId = null } = {
        ...pagination,
        ...filters,
      };
      const skip = (page - 1) * limit;

      const query = { employerId, deletedAt: null };
      if (status) query.status = status;
      if (jobId) query.jobId = jobId;

      const applications = await Application.find(query)
        .populate('candidateId', 'name email profile')
        .populate('jobId', 'title category')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Application.countDocuments(query);

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get employer applications', {
        error: error.message,
        employerId,
      });
      throw error;
    }
  }

  /**
   * Get single application
   */
  async getApplicationById(applicationId) {
    try {
      const application = await Application.findById(applicationId)
        .populate('candidateId', 'name email profile phone')
        .populate('jobId', 'title description category location salary')
        .populate('employerId', 'name email profile')
        .populate('documents');

      if (!application || application.deletedAt) {
        throw new NotFoundError('Application');
      }

      return application;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get application', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId, employerId, newStatus) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Application');
      }

      // Verify ownership
      if (application.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError(
          'Cannot update application you do not own'
        );
      }

      // Validate status transition
      const validStatuses = [
        'applied',
        'viewed',
        'shortlisted',
        'rejected',
        'offer_extended',
        'offer_accepted',
        'offer_declined',
        'withdrawn',
      ];
      if (!validStatuses.includes(newStatus)) {
        throw new ValidationError('Invalid application status');
      }

      application.status = newStatus;

      // Update stage based on status
      if (newStatus === 'shortlisted') {
        application.stage = 'initial_screening';
      } else if (newStatus === 'offer_extended') {
        application.stage = 'offer_stage';
      } else if (newStatus === 'offer_accepted') {
        application.stage = 'completed';
      } else if (newStatus === 'rejected') {
        application.stage = 'rejected';
      }

      await application.save();

      logger.info('Application status updated', {
        applicationId,
        newStatus,
        employerId,
      });

      return application;
    } catch (error) {
      if (
        error instanceof (NotFoundError ||
          AuthorizationError ||
          ValidationError)
      )
        throw error;
      logger.error('Failed to update application status', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Schedule interview
   */
  async scheduleInterview(applicationId, employerId, interviewData) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Application');
      }

      // Verify ownership
      if (application.employerId.toString() !== employerId.toString()) {
        throw new AuthorizationError(
          'Cannot schedule interview for application you do not own'
        );
      }

      // Add interview to interviews array
      application.interviews.push({
        type: interviewData.type || 'phone',
        scheduledDate: interviewData.scheduledDate,
        interviewerName: interviewData.interviewerName,
        notes: interviewData.notes,
        status: 'scheduled',
      });

      // Update application stage
      application.stage = 'interview';
      application.status = 'shortlisted';

      await application.save();

      logger.info('Interview scheduled', {
        applicationId,
        employerId,
        scheduledDate: interviewData.scheduledDate,
      });

      return application;
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError))
        throw error;
      logger.error('Failed to schedule interview', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId, candidateId) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Application');
      }

      // Verify ownership
      if (application.candidateId.toString() !== candidateId.toString()) {
        throw new AuthorizationError(
          'Cannot withdraw application you do not own'
        );
      }

      application.status = 'withdrawn';
      application.withdrawnAt = new Date();
      await application.save();

      logger.info('Application withdrawn', {
        applicationId,
        candidateId,
      });

      return application;
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError))
        throw error;
      logger.error('Failed to withdraw application', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Add document to application
   */
  async addDocument(applicationId, candidateId, documentData, file) {
    try {
      // Verify application exists and belongs to candidate
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Application');
      }

      if (application.candidateId.toString() !== candidateId.toString()) {
        throw new AuthorizationError(
          'Cannot add document to application you do not own'
        );
      }

      // Check document count limit (max 3 per application)
      const documentCount = await ApplicationDocument.countDocuments({
        applicationId,
        deletedAt: null,
      });

      if (documentCount >= 3) {
        throw new ValidationError('Maximum 3 documents allowed per application');
      }

      // Create document
      const appDoc = new ApplicationDocument({
        applicationId,
        candidateId,
        jobId: application.jobId,
        employerId: application.employerId,
        fileName: file.originalname,
        fileSize: file.size,
        fileMimeType: file.mimetype,
        fileUrl: documentData.fileUrl, // S3 or local path
        documentType: documentData.documentType, // resume, cover_letter, portfolio, etc
        virusScanStatus: 'pending',
      });

      await appDoc.save();

      // Add document reference to application
      application.documents.push(appDoc._id);
      await application.save();

      logger.info('Document added to application', {
        applicationId,
        documentId: appDoc._id,
        candidateId,
      });

      return appDoc;
    } catch (error) {
      if (
        error instanceof (NotFoundError ||
          AuthorizationError ||
          ValidationError)
      )
        throw error;
      logger.error('Failed to add document', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Get application documents
   */
  async getApplicationDocuments(applicationId) {
    try {
      const documents = await ApplicationDocument.find({
        applicationId,
        deletedAt: null,
      });

      return documents;
    } catch (error) {
      logger.error('Failed to get application documents', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Delete application (soft delete)
   */
  async deleteApplication(applicationId, userId, userRole) {
    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Application');
      }

      // Verify authorization (candidate or employer can delete)
      const isCandidate = application.candidateId.toString() === userId.toString();
      const isEmployer = application.employerId.toString() === userId.toString();

      if (!isCandidate && !isEmployer) {
        throw new AuthorizationError('Cannot delete this application');
      }

      // Soft delete
      application.deletedAt = new Date();
      await application.save();

      logger.info('Application deleted', {
        applicationId,
        userId,
        userRole,
      });

      return { message: 'Application deleted successfully' };
    } catch (error) {
      if (error instanceof (NotFoundError || AuthorizationError))
        throw error;
      logger.error('Failed to delete application', {
        error: error.message,
        applicationId,
      });
      throw error;
    }
  }
}

export default new ApplicationService();
