import mongoose from 'mongoose';

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      maxlength: 160,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    currentTitle: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    currentCompany: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 70,
    },
    location: {
      country: String,
      city: String,
      state: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          sparse: true,
        },
      },
    },
    skills: [
      {
        name: String,
        endorsements: {
          type: Number,
          default: 0,
        },
      },
    ],
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startYear: Number,
        endYear: Number,
        current: Boolean,
      },
    ],
    certifications: [
      {
        name: String,
        issuingOrganization: String,
        issueDate: Date,
        expirationDate: Date,
        credentialId: String,
        credentialUrl: String,
      },
    ],
    profileCompleteness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
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
    preferences: {
      jobTypes: [
        {
          type: String,
          enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Freelance'],
        },
      ],
      salaryExpectation: {
        min: Number,
        max: Number,
        currency: {
          type: String,
          default: 'USD',
        },
      },
      preferredLocations: [String],
      remotePreference: {
        type: String,
        enum: ['On-site', 'Hybrid', 'Remote'],
      },
      openToRelocate: Boolean,
    },
    visibility: {
      type: String,
      enum: ['Public', 'Private', 'Limited'],
      default: 'Public',
      index: true,
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
candidateProfileSchema.index({ userId: 1, deletedAt: 1 });
candidateProfileSchema.index({ profileCompleteness: 1, deletedAt: 1 });
candidateProfileSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
candidateProfileSchema.index({ isPremium: 1, premiumExpiresAt: 1, deletedAt: 1 });
candidateProfileSchema.index({ visibility: 1, deletedAt: 1 });
candidateProfileSchema.index({ 'skills.name': 1, deletedAt: 1 });
candidateProfileSchema.index({ boost: 1, deletedAt: 1 });
candidateProfileSchema.index({ createdAt: -1, deletedAt: 1 });

// Query helper for soft delete
candidateProfileSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

export default mongoose.model('CandidateProfile', candidateProfileSchema);
