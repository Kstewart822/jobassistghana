/**
 * Response Handler - Standardized API response formatting
 */
export const responseHandler = {
  /**
   * Success response
   */
  success: (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Created response (201)
   */
  created: (res, data, message = 'Resource created successfully') => {
    return res.status(201).json({
      success: true,
      data,
      message,
      statusCode: 201,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Error response
   */
  error: (
    res,
    message = 'An error occurred',
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR'
  ) => {
    return res.status(statusCode).json({
      success: false,
      data: null,
      message,
      statusCode,
      errorCode,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Paginated response
   */
  paginated: (res, data, pagination, message = 'Data retrieved successfully', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      pagination,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  },
};

export default responseHandler;
