export class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  console.error(`[Auth Error] ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(err.statusCode || 500).json({
    error: {
      code: err.errorCode || "INTERNAL_SERVER_ERROR",
      message: err.message || "Internal Server Error",
    },
  });
};
