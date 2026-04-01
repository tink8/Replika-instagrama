const HttpError = require("./httpError");

function toIdString(value, fieldName) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new HttpError(
      400,
      "INVALID_FIELDS",
      `Field '${fieldName}' is required.`
    );
  }

  return normalized;
}

function toPositiveInt(value, fieldName, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(
      400,
      "INVALID_FIELDS",
      `Field '${fieldName}' must be a positive integer.`
    );
  }

  return parsed;
}

function parsePagination(query, defaultLimit = 20, maxLimit = 50) {
  const page = toPositiveInt(query.page, "page", 1);
  const limit = Math.min(
    toPositiveInt(query.limit, "limit", defaultLimit),
    maxLimit
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

module.exports = {
  toIdString,
  toPositiveInt,
  parsePagination
};
