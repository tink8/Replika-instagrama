export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(err.statusCode || 500).json({
    error: {
      code: err.errorCode || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred on the server.",
    },
  });
};

export class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
