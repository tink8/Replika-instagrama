const jwt = require("jsonwebtoken");
const fs = require("fs");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

// Read the public key synchronously on startup
let publicKey;
try {
  publicKey = fs.readFileSync(env.jwtPublicKeyPath, "utf8");
} catch (err) {
  console.error(
    `Failed to read public key at ${env.jwtPublicKeyPath}:`,
    err.message,
  );
  console.warn("Authentication will fail until the public key is provided.");
}

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "Missing or invalid authorization header",
      );
    }

    const token = authHeader.split(" ")[1];

    if (!publicKey) {
      throw new ApiError(
        500,
        "INTERNAL_SERVER_ERROR",
        "Public key not configured for token validation",
      );
    }

    // Verify the token using the RS256 algorithm and the public key
    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

    // Attach the decoded user info (specifically userId) to the request object
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else if (err.name === "TokenExpiredError") {
      next(new ApiError(401, "UNAUTHORIZED", "Token has expired"));
    } else {
      next(new ApiError(401, "UNAUTHORIZED", "Invalid token"));
    }
  }
};

module.exports = requireAuth;
