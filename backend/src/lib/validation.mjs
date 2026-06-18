/**
 * Validation schemas using Zod for type-safe validation
 */
import { z } from 'zod';

// User validation schemas
export const userSchemas = {
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[@$!%*?&]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['candidate', 'employer', 'admin']),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  updateProfile: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),

  changePassword: z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[@$!%*?&]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

// Job validation schemas
export const jobSchemas = {
  create: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    location: z.string().min(2, 'Location is required'),
    salary: z.object({
      min: z.number().positive('Minimum salary must be positive'),
      max: z.number().positive('Maximum salary must be positive'),
      currency: z.string().length(3, 'Currency must be 3 characters'),
    }),
    jobType: z.enum(['full-time', 'part-time', 'contract', 'temporary']),
    category: z.string(),
    requirements: z.array(z.string()).min(1, 'At least one requirement is required'),
  }),

  update: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z.string().min(20, 'Description must be at least 20 characters').optional(),
    location: z.string().min(2, 'Location is required').optional(),
    jobType: z.enum(['full-time', 'part-time', 'contract', 'temporary']).optional(),
  }),
};

// Application validation schemas
export const applicationSchemas = {
  create: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    message: z.string().optional(),
  }),

  updateStatus: z.object({
    status: z.enum(['applied', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn']),
  }),
};

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
  sort: z.string().optional(),
});

export default {
  userSchemas,
  jobSchemas,
  applicationSchemas,
  paginationSchema,
};
