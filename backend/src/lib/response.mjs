/**
 * Centralized response formatting for API consistency
 */

export class ApiResponse {
  constructor(success = true, data = null, message = 'Success', statusCode = 200) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = 'Success', statusCode = 200) {
    return new ApiResponse(true, data, message, statusCode);
  }

  static created(data, message = 'Resource created successfully') {
    return new ApiResponse(true, data, message, 201);
  }

  static error(message, statusCode = 400, data = null) {
    return new ApiResponse(false, data, message, statusCode);
  }

  static paginated(items, total, page, limit, message = 'Success') {
    const totalPages = Math.ceil(total / limit);
    const data = {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
    return new ApiResponse(true, data, message, 200);
  }
}

export const responseHandler = {
  /**
   * Send successful response
   */
  success: (res, data, message = 'Success', statusCode = 200) => {
    const response = ApiResponse.success(data, message, statusCode);
    res.status(statusCode).json(response);
  },

  /**
   * Send created response (201)
   */
  created: (res, data, message = 'Resource created successfully') => {
    const response = ApiResponse.created(data, message);
    res.status(201).json(response);
  },

  /**
   * Send error response
   */
  error: (res, message, statusCode = 400, data = null) => {
    const response = ApiResponse.error(message, statusCode, data);
    res.status(statusCode).json(response);
  },

  /**
   * Send paginated response
   */
  paginated: (res, items, total, page, limit, message = 'Success') => {
    const response = ApiResponse.paginated(items, total, page, limit, message);
    res.status(200).json(response);
  },

  /**
   * Send validation error with details
   */
  validationError: (res, errors, message = 'Validation failed') => {
    const response = {
      success: false,
      message,
      statusCode: 400,
      errors,
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(response);
  },
};

export default { ApiResponse, responseHandler };
