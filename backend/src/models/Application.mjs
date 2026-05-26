import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Unique constraint to prevent duplicate applications
    // Compound index on candidateId + jobId ensures one application per candidate per job
    status: {
      type: String,
      enum: [
        'applied',
        'viewed',
        'shortlisted',
        'rejected',
        'offer_extended',
        'offer_accepted',
        'offer_declined',
        'withdrawn',
      ],
      default: 'applied',
      index: true,
    },
    stage: {
      type: String,
      enum: [
        'initial_screening',
        'phone_screen',
        'technical_interview',
        'final_interview',
        'offer_stage',
        'rejected',
        'completed',
      ],
      default: 'initial_screening',
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      sparse: true,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    customAnswers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        question: String,
        answer: mongoose.Schema.Types.Mixed,
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicationDocument',
      },
    ],
    // Maximum 3 documents per application
    documentCount: {
      type: Number,
      default: 0,
      max: 3,
    },
    resume: {
      fileKey: String,
      fileName: String,
      fileSize: Number,
      uploadedAt: Date,
    },
    coverLetter: String,
    phoneNumber: String,
    email: String,
    linkedinProfile: String,
    portfolio: String,
    offerDetails: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
      expiresAt: Date,
      terms: String,
      extendedAt: Date,
      extendedReason: String,
    },
    rejectionReason: {
      type: String,
      enum: [
        'overqualified',
        'underqualified',
        'poor_fit',
        'no_response',
        'position_filled',
        'other',
      ],
      sparse: true,
    },
    rejectionNotes: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    shortlistedAt: Date,
    shortlistedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    interviewScheduled: [
      {
        type: String,
        enum: ['phone_screen', 'technical_interview', 'final_interview'],
        scheduledDate: Date,
        scheduledBy: mongoose.Schema.Types.ObjectId,
        interviewerName: String,
        interviewerEmail: String,
        meetingLink: String,
      },
    ],
    feedback: [
      {
        interviewerName: String,
        interviewerEmail: String,
        round: String,
        rating: Number,
        comments: String,
        submittedAt: Date,
      },
    ],
    tags: [String],
    isUnlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    unlockedAt: {
      type: Date,
      sparse: true,
    },
    unlockPrice: {
      type: Number,
      sparse: true,
    },
    withdrawnAt: {
      type: Date,
      sparse: true,
    },
    withdrawnReason: String,
    lastInteractionAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['website', 'api', 'imported', 'manual'],
      default: 'website',
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

// CRITICAL: Compound unique index to prevent duplicate applications
// Ensures a candidate can only apply to a specific job once
applicationSchema.index(
  { candidateId: 1, jobId: 1, deletedAt: 1 },
  { unique: true, sparse: true }
);

// Indexes for efficient querying
applicationSchema.index({ candidateId: 1, status: 1, deletedAt: 1 });
applicationSchema.index({ employerId: 1, status: 1, deletedAt: 1 });
applicationSchema.index({ jobId: 1, status: 1, deletedAt: 1 });
applicationSchema.index({
  status: 1,
  stage: 1,
  createdAt: -1,
  deletedAt: 1,
});
applicationSchema.index({ lastInteractionAt: -1, deletedAt: 1 });
applicationSchema.index({
  candidateId: 1,
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
applicationSchema.index({ isUnlocked: 1, deletedAt: 1 });
applicationSchema.index({
  employerId: 1,
  isUnlocked: 1,
  status: 1,
  deletedAt: 1,
});

// Query helpers
applicationSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

applicationSchema.query.pending = function () {
  return this.where({
    status: { $nin: ['rejected', 'offer_declined', 'withdrawn'] },
    deletedAt: null,
  });
};

applicationSchema.query.byCandidate = function (candidateId) {
  return this.where({ candidateId, deletedAt: null });
};

applicationSchema.query.byEmployer = function (employerId) {
  return this.where({ employerId, deletedAt: null });
};

applicationSchema.query.byJob = function (jobId) {
  return this.where({ jobId, deletedAt: null });
};

// Pre-save validation
applicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Check if application already exists
    const existingApp = await mongoose.model('Application').findOne({
      candidateId: this.candidateId,
      jobId: this.jobId,
      deletedAt: null,
    });

    if (existingApp) {
      const err = new Error(
        'Candidate has already applied for this job'
      );
      err.statusCode = 409;
      return next(err);
    }
  }
  next();
});

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
