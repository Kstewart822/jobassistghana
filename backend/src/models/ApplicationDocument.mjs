import mongoose from 'mongoose';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const applicationDocumentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
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
    fileName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ALLOWED_MIME_TYPES,
    },
    fileSize: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value <= MAX_FILE_SIZE;
        },
        message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      },
    },
    fileKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fileUrl: String,
    documentType: {
      type: String,
      enum: [
        'resume',
        'cover_letter',
        'portfolio',
        'certificate',
        'degree',
        'work_sample',
        'other',
      ],
      default: 'other',
      index: true,
    },
    s3Metadata: {
      bucket: String,
      key: String,
      etag: String,
      uploadedBy: String,
    },
    virusScanStatus: {
      type: String,
      enum: ['pending', 'safe', 'infected', 'failed'],
      default: 'pending',
      index: true,
    },
    virusScanResults: {
      scanedAt: Date,
      result: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    accessLog: [
      {
        accessedBy: mongoose.Schema.Types.ObjectId,
        accessedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      sparse: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
      sparse: true,
    },
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
applicationDocumentSchema.index({
  applicationId: 1,
  documentType: 1,
  deletedAt: 1,
});
applicationDocumentSchema.index({ candidateId: 1, deletedAt: 1 });
applicationDocumentSchema.index({ employerId: 1, deletedAt: 1 });
applicationDocumentSchema.index({
  virusScanStatus: 1,
  createdAt: -1,
  deletedAt: 1,
});
applicationDocumentSchema.index({
  isVerified: 1,
  verifiedAt: -1,
  deletedAt: 1,
});
applicationDocumentSchema.index({
  applicationId: 1,
  candidateId: 1,
  deletedAt: 1,
});

// Validation
applicationDocumentSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Check document count for application (max 3)
    const documentCount = await mongoose
      .model('ApplicationDocument')
      .countDocuments({
        applicationId: this.applicationId,
        deletedAt: null,
      });

    if (documentCount >= 3) {
      const err = new Error(
        'Maximum 3 documents allowed per application'
      );
      err.statusCode = 400;
      return next(err);
    }

    // Validate file size
    if (this.fileSize > MAX_FILE_SIZE) {
      const err = new Error(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024} MB`
      );
      err.statusCode = 400;
      return next(err);
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(this.fileType)) {
      const err = new Error(
        `File type ${this.fileType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
      err.statusCode = 400;
      return next(err);
    }
  }

  next();
});

// Query helpers
applicationDocumentSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

applicationDocumentSchema.query.safe = function () {
  return this.where({ virusScanStatus: 'safe', deletedAt: null });
};

export const ApplicationDocument = mongoose.model('ApplicationDocument', applicationDocumentSchema);
export default ApplicationDocument;
