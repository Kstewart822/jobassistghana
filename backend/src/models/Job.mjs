import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployerProfile',
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 150,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },
    requirements: [String],
    responsibilities: [String],
    niceToHave: [String],
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Freelance'],
      required: true,
      index: true,
    },
    experienceLevel: {
      type: String,
      enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD',
      },
      isNegotiable: {
        type: Boolean,
        default: false,
      },
      isHidden: {
        type: Boolean,
        default: false,
      },
    },
    location: {
      country: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: String,
      remote: {
        type: String,
        enum: ['On-site', 'Hybrid', 'Remote'],
        required: true,
        index: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
          sparse: true,
        },
      },
    },
    skills: [
      {
        name: {
          type: String,
          required: true,
        },
        level: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        },
        yearsRequired: Number,
      },
    ],
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['weeks', 'months'],
      },
    },
    benefits: [String],
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'archived', 'expired'],
      default: 'draft',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'limited'],
      default: 'public',
      index: true,
    },
    isHighlight: {
      type: Boolean,
      default: false,
      index: true,
    },
    highlight: {
      expiresAt: Date,
      purchasedAt: Date,
    },
    boosts: {
      isActive: {
        type: Boolean,
        default: false,
      },
      boostCount: {
        type: Number,
        default: 0,
      },
      lastBoostedAt: Date,
      expiresAt: Date,
    },
    applicationThreshold: {
      type: Number,
      default: 1000,
      index: true,
    },
    applicationCount: {
      total: {
        type: Number,
        default: 0,
      },
      shortlisted: {
        type: Number,
        default: 0,
      },
      rejected: {
        type: Number,
        default: 0,
      },
      accepted: {
        type: Number,
        default: 0,
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      sparse: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      sparse: true,
      index: true,
    },
    closedAt: {
      type: Date,
      sparse: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    featuredUntil: {
      type: Date,
      sparse: true,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    estimatedApplications: Number,
    customQuestions: [
      {
        question: String,
        type: {
          type: String,
          enum: ['text', 'multiline', 'multiselect', 'yesno'],
        },
        required: Boolean,
        order: Number,
      },
    ],
    allowUnverifiedApplications: {
      type: Boolean,
      default: false,
    },
    autoRejectUnqualified: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
jobSchema.index({ employerId: 1, status: 1, deletedAt: 1 });
jobSchema.index({ status: 1, publishedAt: -1, deletedAt: 1 });
jobSchema.index({ title: 'text', description: 'text', category: 'text' });
jobSchema.index({ 'location.coordinates': '2dsphere' });
jobSchema.index({
  'location.remote': 1,
  experienceLevel: 1,
  jobType: 1,
  status: 1,
  deletedAt: 1,
});
jobSchema.index({ category: 1, status: 1, deletedAt: 1 });
jobSchema.index({ isHighlight: 1, status: 1, deletedAt: 1 });
jobSchema.index({ isFeatured: 1, status: 1, deletedAt: 1 });
jobSchema.index({ 'skills.name': 1, status: 1, deletedAt: 1 });
jobSchema.index({ expiresAt: 1, status: 1, deletedAt: 1 });
jobSchema.index({ visibility: 1, status: 1, deletedAt: 1 });

// Query helpers
jobSchema.query.active = function () {
  return this.where({
    status: 'active',
    deletedAt: null,
  });
};

jobSchema.query.available = function () {
  const now = new Date();
  return this.where({
    status: 'active',
    deletedAt: null,
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  });
};

export const Job = mongoose.model('Job', jobSchema);
export default Job;
