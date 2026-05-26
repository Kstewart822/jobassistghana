/**
 * Job Validation Schemas - Zod schemas for job operations
 */
import { z } from 'zod';

export const jobSchemas = {
  create: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    category: z.string().min(2, 'Category is required'),
    location: z.string().min(2, 'Location is required'),
    jobType: z
      .enum(['full-time', 'part-time', 'contract', 'temporary', 'internship'])
      .default('full-time'),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    skillsRequired: z.array(z.string()).optional(),
    customQuestions: z
      .array(
        z.object({
          question: z.string(),
          type: z.enum(['text', 'multiple-choice', 'essay']),
          isRequired: z.boolean().optional(),
        })
      )
      .optional(),
    experience: z.string().optional(),
    workMode: z.enum(['on-site', 'remote', 'hybrid']).optional(),
  }),

  update: z.object({
    title: z.string().min(5).optional(),
    description: z.string().min(20).optional(),
    category: z.string().optional(),
    location: z.string().optional(),
    jobType: z
      .enum(['full-time', 'part-time', 'contract', 'temporary', 'internship'])
      .optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    skillsRequired: z.array(z.string()).optional(),
    customQuestions: z.array(z.object({})).optional(),
    experience: z.string().optional(),
    workMode: z.enum(['on-site', 'remote', 'hybrid']).optional(),
    status: z
      .enum(['draft', 'active', 'closed', 'archived', 'expired'])
      .optional(),
  }),
};
