const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Handle unexpected errors (e.g., database connection drops, syntax errors)
  console.error("Unhandled Exception:", err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
};

module.exports = errorHandler;
