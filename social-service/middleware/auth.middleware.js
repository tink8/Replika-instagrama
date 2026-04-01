const { verifyJwt } = require("../utils/jwt");

function sendAuthError(res, status, code, message) {
  return res.status(status).json({
    error: {
      code,
      message
    }
  });
}

function extractBearerToken(authHeader) {
  if (!authHeader) {
    return {
      ok: false,
      status: 401,
      code: "TOKEN_MISSING",
      message: "Authorization token is required."
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      code: "TOKEN_MALFORMED",
      message: "Authorization token is malformed."
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "TOKEN_MALFORMED",
      message: "Authorization token is malformed."
    };
  }

  return { ok: true, token };
}

function decodeOrSend(req, res) {
  const extracted = extractBearerToken(req.headers.authorization);
  if (!extracted.ok) {
    sendAuthError(res, extracted.status, extracted.code, extracted.message);
    return null;
  }

  try {
    return verifyJwt(extracted.token);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      sendAuthError(
        res,
        401,
        "TOKEN_EXPIRED",
        "Authorization token has expired."
      );
      return null;
    }

    sendAuthError(
      res,
      401,
      "TOKEN_INVALID",
      "Authorization token is invalid."
    );
    return null;
  }
}

function requireAuth(req, res, next) {
  const payload = decodeOrSend(req, res);
  if (!payload) {
    return;
  }

  const userId = payload.userId || payload.sub || payload.id;
  if (!userId) {
    sendAuthError(res, 401, "TOKEN_INVALID", "Authorization token is invalid.");
    return;
  }

  req.user = payload;
  req.userId = String(userId);
  req.token = req.headers.authorization;
  next();
}

module.exports = {
  requireAuth
};
