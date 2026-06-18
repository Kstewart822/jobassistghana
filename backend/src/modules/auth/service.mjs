/**
 * Auth Module - Service
 */
import bcrypt from "bcryptjs";
import { getDatabase } from "../../database/connection.mjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../services/tokenService.mjs";
import { AppError } from "../../middleware/errorHandler.mjs";
import logger from "../../utils/logger.mjs";
import * as sessionService from "../session/service.mjs";

export async function register(userData) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      email: userData.email,
    });
    if (existingUser) {
      throw new AppError("User with this email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create new user
    const newUser = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false,
    };

    const result = await usersCollection.insertOne(newUser);

    logger.info("User registered", { userId: result.insertedId });

    return {
      id: result.insertedId,
      email: newUser.email,
      name: newUser.name,
    };
  } catch (error) {
    logger.error("Register service error:", error);
    throw error;
  }
}

export async function login(credentials) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email: credentials.email });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
    });

    logger.info("User logged in", { userId: user._id });

    // Create session record in database
    const userAgent = process.env.NODE_ENV === "development" ? "development" : "production";
    await sessionService.createSession(
      user._id,
      user.email,
      user.role,
      accessToken,
      refreshToken,
      userAgent,
      "0.0.0.0" // In production, get this from request
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    logger.error("Login service error:", error);
    throw error;
  }
}

export async function refreshToken(token) {
  try {
    const decoded = verifyRefreshToken(token);

    const accessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
    });

    return { accessToken };
  } catch (error) {
    logger.error("Refresh token error:", error);
    throw new AppError("Invalid refresh token", 401);
  }
}

export async function logout(userId) {
  try {
    // Implement logout logic (e.g., blacklist token)
    logger.info("User logged out", { userId });
  } catch (error) {
    logger.error("Logout service error:", error);
    throw error;
  }
}

export async function forgotPassword(email) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection("users");

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      logger.warn("Forgot password for non-existent email", { email });
      return;
    }

    // Generate reset token
    const resetToken = generateAccessToken(
      {
        id: user._id.toString(),
        type: "reset",
      },
      "1h",
    );

    // TODO: Send reset link via email
    logger.info("Password reset requested", { userId: user._id });
  } catch (error) {
    logger.error("Forgot password service error:", error);
    throw error;
  }
}

export async function resetPassword(token, newPassword) {
  try {
    // TODO: Verify and decode reset token
    // TODO: Update user password
    logger.info("Password reset completed");
  } catch (error) {
    logger.error("Reset password service error:", error);
    throw error;
  }
}

export async function changePassword(userId, passwordData) {
  try {
    const db = getDatabase();
    const usersCollection = db.collection("users");

    // Find user
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      passwordData.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(passwordData.newPassword, 10);

    // Update password
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
    );

    logger.info("Password changed", { userId });
  } catch (error) {
    logger.error("Change password service error:", error);
    throw error;
  }
}
