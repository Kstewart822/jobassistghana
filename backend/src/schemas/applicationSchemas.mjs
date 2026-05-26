/**
 * Application Validation Schemas - Zod schemas for application operations
 */
import { z } from 'zod';

export const applicationSchemas = {
  submit: z.object({
    jobId: z.string().regex(/^[a-zA-Z0-9]{24}$/, 'Invalid job ID'),
    coverLetter: z.string().max(2000).optional(),
  }),

  updateStatus: z.object({
    status: z.enum([
      'applied',
      'viewed',
      'shortlisted',
      'rejected',
      'offer_extended',
      'offer_accepted',
      'offer_declined',
      'withdrawn',
    ]),
  }),

  scheduleInterview: z.object({
    type: z.enum(['phone', 'video', 'in-person']).optional(),
    scheduledDate: z.string().datetime(),
    interviewerName: z.string().optional(),
    notes: z.string().max(1000).optional(),
  }),

  addDocument: z.object({
    documentType: z.enum([
      'resume',
      'cover_letter',
      'portfolio',
      'certificate',
      'other',
    ]),
  }),
};
