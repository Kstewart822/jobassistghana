export const USER_ROLES = {
  CANDIDATE: "candidate",
  EMPLOYER: "employer",
  ADMIN: "admin",
};

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

export const JOB_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
  EXPIRED: "expired",
};

export const APPLICATION_STATUS = {
  APPLIED: "applied",
  REVIEWED: "reviewed",
  SHORTLISTED: "shortlisted",
  REJECTED: "rejected",
  ACCEPTED: "accepted",
  WITHDRAWN: "withdrawn",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
};

export const BOOST_TYPE = {
  JOB: "job",
  PROFILE: "profile",
};

export const NOTIFICATION_TYPE = {
  APPLICATION: "application",
  OFFER: "offer",
  MESSAGE: "message",
  SYSTEM: "system",
  PAYMENT: "payment",
};

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};

export default {
  USER_ROLES,
  USER_STATUS,
  JOB_STATUS,
  APPLICATION_STATUS,
  PAYMENT_STATUS,
  BOOST_TYPE,
  NOTIFICATION_TYPE,
  ERROR_CODES,
};
