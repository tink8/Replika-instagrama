module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.response?.status || 500;
  const message =
    error.response?.data?.error ||
    error.message ||
    "Doslo je do neocekivane greske.";

  res.status(status).json({
    error: message,
    details: error.response?.data || null
  });
};
