function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePagination(query) {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(toPositiveInt(query.limit, 10), 50);

  return {
    page,
    limit
  };
}

function extractCurrentUserId(req) {
  const userId = Number.parseInt(req.userId || req.headers["x-user-id"], 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error("Nedostaje validan X-User-Id header.");
    error.status = 401;
    throw error;
  }

  return userId;
}

module.exports = {
  parsePagination,
  extractCurrentUserId
};
