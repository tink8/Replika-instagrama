export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred on the server.";

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      errorCode = "FILE_TOO_LARGE";
      message = "Each file must not exceed 50MB.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      statusCode = 400;
      errorCode = "TOO_MANY_MEDIA";
      message = "A post can contain a maximum of 20 media items.";
    } else {
      statusCode = 400;
      errorCode = "FILE_UPLOAD_ERROR";
      message = err.message;
    }
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
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
