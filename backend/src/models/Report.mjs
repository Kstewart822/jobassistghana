import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: [
        'user_behavior',
        'job_posting',
        'inappropriate_content',
        'fraud',
        'spam',
        'harassment',
        'discrimination',
        'fake_profile',
        'scam',
        'other',
      ],
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['User', 'Job', 'Application', 'Message', 'Review', 'Comment'],
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    evidence: [
      {
        type: String, // URL or file key to screenshots/evidence
        uploadedAt: Date,
      },
    ],
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'under_review',
        'investigating',
        'resolved',
        'dismissed',
        'escalated',
      ],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    firstReviewedAt: {
      type: Date,
      sparse: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    decision: {
      type: String,
      enum: ['upheld', 'denied', 'partial_action'],
      sparse: true,
    },
    decisionReason: String,
    decisionAt: {
      type: Date,
      sparse: true,
    },
    actions: [
      {
        actionType: {
          type: String,
          enum: [
            'warning',
            'suspend',
            'ban',
            'remove_content',
            'require_verification',
            'investigation',
            'none',
          ],
        },
        actionTaken: Boolean,
        takenAt: Date,
        takenBy: mongoose.Schema.Types.ObjectId,
        details: String,
      },
    ],
    appeal: {
      appealed: {
        type: Boolean,
        default: false,
      },
      appealedAt: Date,
      appealReason: String,
      appealStatus: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        sparse: true,
      },
      appealReviewedAt: Date,
      appealReviewedBy: mongoose.Schema.Types.ObjectId,
    },
    internalNotes: String,
    internalComments: [
      {
        comment: String,
        commentedBy: mongoose.Schema.Types.ObjectId,
        commentedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      sparse: true,
    },
    relatedReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
      },
    ],
    notificationSent: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      sparse: true,
    },
    resolutionSummary: String,
    daysToResolve: Number,
    tags: [String],
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
reportSchema.index({ reportedBy: 1, status: 1, deletedAt: 1 });
reportSchema.index({ reportedUser: 1, status: 1, deletedAt: 1 });
reportSchema.index({ reportType: 1, status: 1, deletedAt: 1 });
reportSchema.index({
  resourceType: 1,
  resourceId: 1,
  status: 1,
  deletedAt: 1,
});
reportSchema.index({ status: 1, severity: 1, createdAt: -1, deletedAt: 1 });
reportSchema.index({
  priority: 1,
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
reportSchema.index({ assignedTo: 1, status: 1, deletedAt: 1 });
reportSchema.index({
  'appeal.appealed': 1,
  'appeal.appealStatus': 1,
  deletedAt: 1,
});
reportSchema.index({
  resolvedAt: 1,
  status: 1,
  deletedAt: 1,
});
reportSchema.index({
  duplicateOf: 1,
  status: 1,
  deletedAt: 1,
});

// Query helpers
reportSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

reportSchema.query.pending = function () {
  return this.where({ status: 'pending', deletedAt: null });
};

reportSchema.query.byReporter = function (reportedBy) {
  return this.where({ reportedBy, deletedAt: null });
};

reportSchema.query.byType = function (reportType) {
  return this.where({ reportType, deletedAt: null });
};

reportSchema.query.highPriority = function () {
  return this.where({
    priority: { $in: ['high', 'urgent'] },
    status: { $ne: 'resolved' },
    deletedAt: null,
  });
};

reportSchema.query.unreviewed = function () {
  return this.where({
    status: 'pending',
    firstReviewedAt: null,
    deletedAt: null,
  });
};

reportSchema.query.assignedTo = function (userId) {
  return this.where({ assignedTo: userId, deletedAt: null });
};

// Pre-save hook to calculate daysToResolve
reportSchema.pre('save', function (next) {
  if (this.resolvedAt && this.createdAt) {
    this.daysToResolve = Math.ceil(
      (this.resolvedAt.getTime() - this.createdAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }
  next();
});

export default mongoose.model('Report', reportSchema);
