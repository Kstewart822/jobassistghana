import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'mobile_money'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'flutterwave', 'manual'],
      required: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      required: true,
    },
    exchangeRate: Number,
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'partial_refund',
      ],
      default: 'pending',
      index: true,
    },
    paymentType: {
      type: String,
      enum: [
        'job_posting',
        'boost',
        'premium_subscription',
        'highlight',
        'applicant_unlock',
        'feature_access',
        'custom',
      ],
      required: true,
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      sparse: true,
      index: true,
    },
    relatedType: {
      type: String,
      enum: ['Job', 'Boost', 'Subscription', 'ApplicantUnlock'],
      sparse: true,
    },
    description: String,
    metadata: {
      jobId: mongoose.Schema.Types.ObjectId,
      applicationId: mongoose.Schema.Types.ObjectId,
      subscriptionPlan: String,
      boostDuration: Number,
      highlightDuration: Number,
      customData: mongoose.Schema.Types.Mixed,
    },
    cardDetails: {
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number,
      country: String,
      holderName: String,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      sparse: true,
      index: true,
    },
    failedAt: {
      type: Date,
      sparse: true,
    },
    failureReason: {
      code: String,
      message: String,
      details: String,
    },
    ipAddress: String,
    userAgent: String,
    fraud: {
      isFlagged: {
        type: Boolean,
        default: false,
      },
      flaggedAt: Date,
      reason: String,
      riskScore: Number,
    },
    receipt: {
      url: String,
      sentAt: Date,
      email: String,
    },
    refund: {
      amount: Number,
      currency: String,
      reason: String,
      initiatedAt: Date,
      completedAt: Date,
      refundTransactionId: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
      },
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      sparse: true,
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
paymentSchema.index({ userId: 1, status: 1, deletedAt: 1 });
paymentSchema.index({ status: 1, paymentType: 1, deletedAt: 1 });
paymentSchema.index({
  completedAt: -1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  provider: 1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  paymentMethod: 1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  'fraud.isFlagged': 1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  'metadata.jobId': 1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  'metadata.applicationId': 1,
  status: 1,
  deletedAt: 1,
});
paymentSchema.index({
  initiatedAt: -1,
  status: 1,
  deletedAt: 1,
});

// Query helpers
paymentSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

paymentSchema.query.completed = function () {
  return this.where({ status: 'completed', deletedAt: null });
};

paymentSchema.query.successful = function () {
  return this.where({
    status: { $in: ['completed', 'partial_refund'] },
    deletedAt: null,
  });
};

paymentSchema.query.failed = function () {
  return this.where({
    status: { $in: ['failed', 'cancelled'] },
    deletedAt: null,
  });
};

paymentSchema.query.pending = function () {
  return this.where({
    status: { $in: ['pending', 'processing'] },
    deletedAt: null,
  });
};

// Pre-save validation
paymentSchema.pre('save', async function (next) {
  // Validate payment can be activated (for payment-dependent features)
  if (this.isNew && this.status === 'completed') {
    if (this.amount <= 0) {
      const err = new Error('Invalid payment amount');
      err.statusCode = 400;
      return next(err);
    }

    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }

  next();
});

export default mongoose.model('Payment', paymentSchema);
