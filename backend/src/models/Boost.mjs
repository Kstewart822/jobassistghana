import mongoose from 'mongoose';

const boostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    boostType: {
      type: String,
      enum: ['job', 'profile'],
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['Job', 'CandidateProfile', 'EmployerProfile'],
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      sparse: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'paused'],
      default: 'active',
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    duration: {
      value: {
        type: Number,
        required: true,
        min: 1,
      },
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
        default: 'days',
      },
    },
    durationInDays: {
      type: Number,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'premium'],
      default: 'medium',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['featured', 'highlighted', 'promoted'],
      default: 'featured',
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    renewalEnabled: {
      type: Boolean,
      default: false,
    },
    nextRenewalDate: {
      type: Date,
      sparse: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
    ctr: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
    analytics: {
      views: Number,
      uniqueViews: Number,
      shareCount: Number,
      saveCount: Number,
      reportCount: Number,
    },
    cancelledAt: {
      type: Date,
      sparse: true,
    },
    cancellationReason: String,
    pausedAt: {
      type: Date,
      sparse: true,
    },
    resumedAt: {
      type: Date,
      sparse: true,
    },
    pauseHistory: [
      {
        pausedAt: Date,
        resumedAt: Date,
        reason: String,
      },
    ],
    refund: {
      amount: Number,
      reason: String,
      processedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
      },
    },
    notes: String,
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
boostSchema.index({ userId: 1, status: 1, deletedAt: 1 });
boostSchema.index({ resourceId: 1, boostType: 1, status: 1, deletedAt: 1 });
boostSchema.index({ status: 1, expiresAt: 1, deletedAt: 1 });
boostSchema.index({ expiresAt: 1, status: 1, deletedAt: 1 });
boostSchema.index({ priority: 1, status: 1, deletedAt: 1 });
boostSchema.index({
  boostType: 1,
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
boostSchema.index({
  userId: 1,
  boostType: 1,
  status: 1,
  deletedAt: 1,
});
boostSchema.index({
  paymentId: 1,
  status: 1,
  deletedAt: 1,
});

// Query helpers
boostSchema.query.active = function () {
  const now = new Date();
  return this.where({
    status: 'active',
    expiresAt: { $gt: now },
    deletedAt: null,
  });
};

boostSchema.query.expired = function () {
  return this.where({ status: 'expired', deletedAt: null });
};

boostSchema.query.byUser = function (userId) {
  return this.where({ userId, deletedAt: null });
};

boostSchema.query.expiringSoon = function (daysAhead = 3) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return this.where({
    status: 'active',
    expiresAt: { $gte: now, $lte: futureDate },
    deletedAt: null,
  });
};

// Pre-save hook to calculate expiration date
boostSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('startedAt') || this.isModified('durationInDays')) {
    const startDate = this.startedAt || new Date();
    this.expiresAt = new Date(startDate.getTime() + this.durationInDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// Calculate CTR and conversion rate on save
boostSchema.pre('save', function (next) {
  if (this.impressions > 0) {
    this.ctr = (this.clicks / this.impressions) * 100;
    this.conversionRate = (this.applications / this.impressions) * 100;
  }
  next();
});

export default mongoose.model('Boost', boostSchema);
