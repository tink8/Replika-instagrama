// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  // Default error structure
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred on the server.";

  // Handle Multer specific errors (e.g., File too large)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      errorCode = "FILE_TOO_LARGE";
      message = "File size must not exceed 50MB.";
    } else {
      statusCode = 400;
      errorCode = "FILE_UPLOAD_ERROR";
      message = err.message;
    }
  }

  // Send the strictly formatted response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: message,
    },
  });
};

// Helper class for throwing custom formatted errors in controllers/services
export class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
