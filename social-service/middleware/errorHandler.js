module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "Internal server error."
    }
  });
};
