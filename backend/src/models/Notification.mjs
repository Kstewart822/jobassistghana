import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'application_received',
        'application_status_changed',
        'interview_scheduled',
        'offer_received',
        'job_match',
        'profile_viewed',
        'message_received',
        'payment_confirmation',
        'boost_expired',
        'job_closed',
        'job_reposted',
        'candidate_reviewed',
        'skill_endorsement',
        'profile_suggestion',
        'system_alert',
        'custom',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    description: String,
    resourceType: {
      type: String,
      enum: [
        'Application',
        'Job',
        'User',
        'Payment',
        'Boost',
        'Message',
        'Profile',
      ],
      sparse: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      sparse: true,
      index: true,
    },
    relatedIds: {
      userId: mongoose.Schema.Types.ObjectId,
      jobId: mongoose.Schema.Types.ObjectId,
      applicationId: mongoose.Schema.Types.ObjectId,
      paymentId: mongoose.Schema.Types.ObjectId,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'archived', 'deleted'],
      default: 'unread',
      index: true,
    },
    readAt: {
      type: Date,
      sparse: true,
    },
    archivedAt: {
      type: Date,
      sparse: true,
    },
    channels: {
      inApp: {
        enabled: {
          type: Boolean,
          default: true,
        },
        sent: Boolean,
        sentAt: Date,
      },
      email: {
        enabled: {
          type: Boolean,
          default: true,
        },
        sent: Boolean,
        sentAt: Date,
        bounced: Boolean,
      },
      sms: {
        enabled: Boolean,
        sent: Boolean,
        sentAt: Date,
      },
      push: {
        enabled: Boolean,
        sent: Boolean,
        sentAt: Date,
      },
    },
    metadata: {
      actionUrl: String,
      imageUrl: String,
      ctaText: String,
      dataPayload: mongoose.Schema.Types.Mixed,
    },
    schedule: {
      scheduledFor: Date,
      timezone: String,
      sent: Boolean,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      sparse: true,
    },
    error: {
      code: String,
      message: String,
      details: String,
    },
    tags: [String],
    campaign: {
      type: String,
      sparse: true,
    },
    source: {
      type: String,
      enum: ['system', 'user', 'automation', 'api'],
      default: 'system',
    },
    analytics: {
      clicked: Boolean,
      clickedAt: Date,
      actionTaken: Boolean,
      actionTakenAt: Date,
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
notificationSchema.index({ recipientId: 1, status: 1, deletedAt: 1 });
notificationSchema.index({
  recipientId: 1,
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
notificationSchema.index({ recipientId: 1, readAt: 1, deletedAt: 1 });
notificationSchema.index({ type: 1, status: 1, deletedAt: 1 });
notificationSchema.index({
  priority: 1,
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
notificationSchema.index({
  resourceType: 1,
  resourceId: 1,
  recipientId: 1,
  deletedAt: 1,
});
notificationSchema.index({ senderId: 1, recipientId: 1, deletedAt: 1 });
notificationSchema.index({
  'channels.email.sent': 1,
  status: 1,
  deletedAt: 1,
});
notificationSchema.index({
  'schedule.scheduledFor': 1,
  'schedule.sent': 1,
  deletedAt: 1,
});

// Query helpers
notificationSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

notificationSchema.query.unread = function () {
  return this.where({ status: 'unread', deletedAt: null });
};

notificationSchema.query.byRecipient = function (recipientId) {
  return this.where({ recipientId, deletedAt: null });
};

notificationSchema.query.byType = function (type) {
  return this.where({ type, deletedAt: null });
};

notificationSchema.query.highPriority = function () {
  return this.where({
    priority: { $in: ['high', 'urgent'] },
    deletedAt: null,
  });
};

notificationSchema.query.pending = function () {
  return this.where({
    status: 'unread',
    'schedule.sent': false,
    deletedAt: null,
  });
};

// Pre-save hook
notificationSchema.pre('save', function (next) {
  if (this.isNew) {
    // Set default metadata
    if (!this.metadata) {
      this.metadata = {};
    }
  }

  next();
});

export default mongoose.model('Notification', notificationSchema);
