/**
 * Centralized error handling middleware
 */
import { AppError, ValidationError } from '../lib/errors.mjs';
import { responseHandler } from '../lib/response.mjs';
import logger from '../utils/logger.mjs';

/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error occurred', {
    message: err.message,
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.entries(err.errors).reduce((acc, [key, error]) => {
      acc[key] = error.message;
      return acc;
    }, {});

    return responseHandler.validationError(res, errors, 'Validation failed');
  }

  // Handle Mongoose CastError
  if (err.name === 'CastError') {
    return responseHandler.error(
      res,
      `Invalid ${err.path}: ${err.value}`,
      400
    );
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return responseHandler.error(
      res,
      `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      409
    );
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return responseHandler.error(
      res,
      'Invalid JSON format',
      400
    );
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    return responseHandler.error(
      res,
      err.message,
      err.statusCode,
      err.details || null
    );
  }

  // Handle unexpected errors
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
  });

  responseHandler.error(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    err.statusCode || 500
  );
}

/**
 * Async route wrapper to handle promise rejections
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res, next) {
  const err = new Error(`Route ${req.originalUrl} not found`);
  res.status(404);
  next(err);
}

export default { errorHandler, asyncHandler, notFoundHandler };

