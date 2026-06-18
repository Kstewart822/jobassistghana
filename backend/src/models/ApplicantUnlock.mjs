import mongoose from "mongoose";

const applicantUnlockSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Unique index to prevent duplicate unlocks
    unlockType: {
      type: String,
      enum: ["contact_info", "employer_details", "salary_details"],
      default: "contact_info",
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    unlockedAt: {
      type: Date,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      sparse: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      sparse: true,
    },
    details: {
      contactPhone: String,
      contactEmail: String,
      contactPerson: String,
      companyWebsite: String,
      officeAddress: String,
      additionalInfo: mongoose.Schema.Types.Mixed,
    },
    accessLog: [
      {
        accessedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
      },
    ],
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      sparse: true,
    },
    failureReason: {
      type: String,
      sparse: true,
    },
    failedAt: {
      type: Date,
      sparse: true,
    },
    refunded: {
      type: Boolean,
      default: false,
    },
    refundedAt: {
      type: Date,
      sparse: true,
    },
    refundReason: String,
    deletedAt: {
      type: Date,
      default: null,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound unique index to prevent duplicate unlocks for same application
applicantUnlockSchema.index(
  { applicationId: 1, candidateId: 1, unlockType: 1, deletedAt: 1 },
  { unique: true, sparse: true },
);

// Indexes for efficient querying
applicantUnlockSchema.index({ candidateId: 1, status: 1, deletedAt: 1 });
applicantUnlockSchema.index({ employerId: 1, status: 1, deletedAt: 1 });
applicantUnlockSchema.index({ jobId: 1, status: 1, deletedAt: 1 });
applicantUnlockSchema.index({
  status: 1,
  createdAt: -1,
  deletedAt: 1,
});
applicantUnlockSchema.index({ paymentId: 1, deletedAt: 1 });
applicantUnlockSchema.index({
  candidateId: 1,
  status: 1,
  expiresAt: 1,
  deletedAt: 1,
});
applicantUnlockSchema.index({
  status: 1,
  refunded: 1,
  deletedAt: 1,
});

// Pre-save validation
applicantUnlockSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Check if unlock already exists
    const existingUnlock = await mongoose.model("ApplicantUnlock").findOne({
      applicationId: this.applicationId,
      candidateId: this.candidateId,
      unlockType: this.unlockType,
      deletedAt: null,
    });

    if (existingUnlock && existingUnlock.status === "completed") {
      const err = new Error("Applicant has already unlocked this information");
      err.statusCode = 409;
      return next(err);
    }

    // Validate price
    if (this.price < 0) {
      const err = new Error("Price cannot be negative");
      err.statusCode = 400;
      return next(err);
    }
  }

  next();
});

// Query helpers
applicantUnlockSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

applicantUnlockSchema.query.completed = function () {
  return this.where({ status: "completed", deletedAt: null });
};

applicantUnlockSchema.query.byCandidate = function (candidateId) {
  return this.where({ candidateId, deletedAt: null });
};

applicantUnlockSchema.query.byEmployer = function (employerId) {
  return this.where({ employerId, deletedAt: null });
};

export default mongoose.model("ApplicantUnlock", applicantUnlockSchema);
