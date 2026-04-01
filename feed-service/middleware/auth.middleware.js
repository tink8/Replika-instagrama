const { verifyJwt } = require("../utils/jwt");

function sendAuthError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message
    }
  });
}

module.exports = function authMiddleware(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return sendAuthError(
      res,
      401,
      "TOKEN_MISSING",
      "Authorization token is required."
    );
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return sendAuthError(
      res,
      401,
      "TOKEN_MALFORMED",
      "Authorization token is malformed."
    );
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    return sendAuthError(
      res,
      401,
      "TOKEN_MALFORMED",
      "Authorization token is malformed."
    );
  }

  try {
    const payload = verifyJwt(token);
    const userId = payload.userId || payload.sub || payload.id;
    if (!userId) {
      return sendAuthError(
        res,
        401,
        "TOKEN_INVALID",
        "Authorization token is invalid."
      );
    }

    req.user = payload;
    req.userId = String(userId);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendAuthError(
        res,
        401,
        "TOKEN_EXPIRED",
        "Authorization token has expired."
      );
    }

    return sendAuthError(
      res,
      401,
      "TOKEN_INVALID",
      "Authorization token is invalid."
    );
  }
};
