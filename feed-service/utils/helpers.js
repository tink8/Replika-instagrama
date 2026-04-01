function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePagination(query) {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(toPositiveInt(query.limit, 20), 50);

  return {
    page,
    limit
  };
}

function extractCurrentUserId(req) {
  const userId = String(req.userId || req.headers["x-user-id"] || "").trim();
  if (!userId) {
    const error = new Error("Authorization token is invalid.");
    error.status = 401;
    error.code = "TOKEN_INVALID";
    throw error;
  }

  return userId;
}

module.exports = {
  parsePagination,
  extractCurrentUserId
};
