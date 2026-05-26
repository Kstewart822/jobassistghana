import mongoose from 'mongoose';

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
      index: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
      sparse: true,
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    industry: {
      type: String,
      enum: [
        'Technology',
        'Healthcare',
        'Finance',
        'Retail',
        'Manufacturing',
        'Education',
        'Marketing',
        'Other',
      ],
      sparse: true,
      index: true,
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      sparse: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    logo: {
      url: String,
      fileKey: String,
    },
    banner: {
      url: String,
      fileKey: String,
    },
    location: {
      country: String,
      city: String,
      state: String,
      zipCode: String,
      address: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          sparse: true,
        },
      },
    },
    headquarters: {
      country: String,
      city: String,
    },
    officeLocations: [
      {
        city: String,
        country: String,
        address: String,
      },
    ],
    socialProfiles: {
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
      index: true,
    },
    verifiedAt: {
      type: Date,
      sparse: true,
    },
    verificationDocuments: [
      {
        fileKey: String,
        fileName: String,
        fileType: String,
        uploadedAt: Date,
      },
    ],
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    premiumExpiresAt: {
      type: Date,
      sparse: true,
      index: true,
    },
    activeJobPostings: {
      type: Number,
      default: 0,
    },
    totalJobPostings: {
      type: Number,
      default: 0,
    },
    totalApplicationsReceived: {
      type: Number,
      default: 0,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
    boost: {
      isActive: {
        type: Boolean,
        default: false,
      },
      boostCount: {
        type: Number,
        default: 0,
      },
      lastBoostedAt: Date,
    },
    teamMembers: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        email: String,
        role: {
          type: String,
          enum: ['admin', 'recruiter', 'viewer'],
          default: 'viewer',
        },
        addedAt: Date,
      },
    ],
    subscriptionPlan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
      index: true,
    },
    subscriptionExpiresAt: {
      type: Date,
      sparse: true,
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
employerProfileSchema.index({ userId: 1, deletedAt: 1 });
employerProfileSchema.index({ companyName: 1, deletedAt: 1 });
employerProfileSchema.index({
  verificationStatus: 1,
  deletedAt: 1,
  verifiedAt: -1,
});
employerProfileSchema.index({ isPremium: 1, premiumExpiresAt: 1, deletedAt: 1 });
employerProfileSchema.index({ industry: 1, deletedAt: 1 });
employerProfileSchema.index({
  'location.coordinates': '2dsphere',
});
employerProfileSchema.index({ subscriptionPlan: 1, deletedAt: 1 });
employerProfileSchema.index({ activeJobPostings: 1, deletedAt: 1 });
employerProfileSchema.index({ createdAt: -1, deletedAt: 1 });

// Query helper for soft delete
employerProfileSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

// Query helper for verified employers
employerProfileSchema.query.verified = function () {
  return this.where({ verificationStatus: 'verified', deletedAt: null });
};

export default mongoose.model('EmployerProfile', employerProfileSchema);
