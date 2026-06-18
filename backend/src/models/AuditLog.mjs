import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'payment', 'admin_action'],
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: [
        'auth',
        'user',
        'profile',
        'job',
        'application',
        'payment',
        'boost',
        'notification',
        'report',
        'admin',
        'system',
      ],
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: [
        'User',
        'CandidateProfile',
        'EmployerProfile',
        'Job',
        'Application',
        'Payment',
        'Boost',
        'Report',
        'Notification',
      ],
      sparse: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      sparse: true,
      index: true,
    },
    resourceName: String,
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
      index: true,
    },
    httpMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      sparse: true,
    },
    endpoint: String,
    ipAddress: String,
    userAgent: String,
    referer: String,
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    changedFields: [String],
    errorMessage: String,
    errorStack: String,
    duration: Number, // in milliseconds
    responseCode: Number,
    dataSize: Number, // request/response size
    metadata: {
      browser: String,
      os: String,
      device: String,
      location: {
        country: String,
        city: String,
        coordinates: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number],
            sparse: true,
          },
        },
      },
      sessionId: String,
      apiKey: String,
      customData: mongoose.Schema.Types.Mixed,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
      index: true,
    },
    performedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      email: String,
      role: String,
    },
    affectedUser: {
      userId: mongoose.Schema.Types.ObjectId,
      email: String,
      role: String,
    },
    relatedAuditLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog',
      },
    ],
    tags: [String],
    complianceRelevant: {
      type: Boolean,
      default: false,
      index: true,
    },
    complianceNotes: String,
    retentionPeriod: {
      type: Number, // in days
      default: 90,
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
auditLogSchema.index({ userId: 1, createdAt: -1, deletedAt: 1 });
auditLogSchema.index({ actionType: 1, createdAt: -1, deletedAt: 1 });
auditLogSchema.index({ module: 1, createdAt: -1, deletedAt: 1 });
auditLogSchema.index({
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
  deletedAt: 1,
});
auditLogSchema.index({ status: 1, severity: 1, createdAt: -1, deletedAt: 1 });
auditLogSchema.index({
  'performedBy.userId': 1,
  createdAt: -1,
  deletedAt: 1,
});
auditLogSchema.index({
  'affectedUser.userId': 1,
  createdAt: -1,
  deletedAt: 1,
});
auditLogSchema.index({ ipAddress: 1, createdAt: -1, deletedAt: 1 });
auditLogSchema.index({
  endpoint: 1,
  httpMethod: 1,
  createdAt: -1,
  deletedAt: 1,
});
auditLogSchema.index({
  complianceRelevant: 1,
  createdAt: -1,
  deletedAt: 1,
});
auditLogSchema.index({
  createdAt: 1,
  deletedAt: 1,
}); // TTL index for log rotation
auditLogSchema.index({ severity: 1, status: 1, createdAt: -1 });

// Query helpers
auditLogSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

auditLogSchema.query.byUser = function (userId) {
  return this.where({ userId, deletedAt: null });
};

auditLogSchema.query.byAction = function (actionType) {
  return this.where({ actionType, deletedAt: null });
};

auditLogSchema.query.byModule = function (module) {
  return this.where({ module, deletedAt: null });
};

auditLogSchema.query.failures = function () {
  return this.where({ status: 'failure', deletedAt: null });
};

auditLogSchema.query.byResource = function (resourceType, resourceId) {
  return this.where({ resourceType, resourceId, deletedAt: null });
};

auditLogSchema.query.critical = function () {
  return this.where({ severity: 'critical', deletedAt: null });
};

auditLogSchema.query.complianceRelevant = function () {
  return this.where({ complianceRelevant: true, deletedAt: null });
};

auditLogSchema.query.recentChanges = function (resourceType, resourceId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.where({
    resourceType,
    resourceId,
    createdAt: { $gte: since },
    deletedAt: null,
  });
};

// Pre-save validation
auditLogSchema.pre('save', function (next) {
  // Ensure critical actions are marked with appropriate severity
  const criticalActions = ['delete', 'admin_action'];
  if (criticalActions.includes(this.actionType) && this.severity === 'info') {
    this.severity = 'warning';
  }

  // Auto-mark compliance relevant actions
  const complianceActions = ['export', 'delete', 'admin_action'];
  if (
    complianceActions.includes(this.actionType) ||
    this.severity === 'critical'
  ) {
    this.complianceRelevant = true;
  }

  next();
});

export default mongoose.model('AuditLog', auditLogSchema);
