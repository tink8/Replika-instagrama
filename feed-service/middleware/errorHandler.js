module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || "Internal server error.";

  res.status(status).json({
    error: {
      code,
      message
    }
  });
};
