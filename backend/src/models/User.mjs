/**
 * Mongoose User model
 */
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { config } from "../config/environment.mjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please provide a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include by default
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      minlength: [2, "Name must be at least 2 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["candidate", "employer", "admin"],
        message: "Role must be one of: candidate, employer, admin",
      },
      default: "candidate",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended", "verified", "unverified"],
        message:
          "Status must be one of: active, inactive, suspended, verified, unverified",
      },
      default: "unverified",
    },
    profile: {
      bio: String,
      phone: String,
      location: String,
      avatar: String,
      website: String,
    },
    permissions: {
      type: [String],
      default: [],
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create indexes
userSchema.index({ email: 1, deletedAt: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcryptjs.genSalt(config.security.bcryptRounds);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Lock the account after 5 attempts for 2 hours
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts >= 4) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Virtual for account status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Don't return password, tokens, etc. by default
userSchema.methods.toJSON = function () {
  const { password, emailVerificationToken, passwordResetToken, ...rest } =
    this.toObject();
  return rest;
};

export const User = mongoose.model("User", userSchema);

export default User;
