import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load RSA Public Key
const publicKeyPath = path.join(__dirname, "../../keys/public.pem");

let publicKey;
try {
  publicKey = fs.readFileSync(publicKeyPath, "utf8");
} catch (error) {
  console.warn(
    "RSA Public Key not found in API Gateway. Please ensure keys are generated.",
  );
}

const sendAuthError = (res, code, message) => {
  res.status(401).json({
    error: {
      code,
      message,
    },
  });
};

/**
 * Middleware to verify JWT token
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendAuthError(
      res,
      "TOKEN_MISSING",
      "Authorization token is required.",
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    return sendAuthError(
      res,
      "TOKEN_MALFORMED",
      "Authorization token is malformed.",
    );
  }

  const token = authHeader.split(" ")[1]?.trim();

  if (!token) {
    return sendAuthError(
      res,
      "TOKEN_MALFORMED",
      "Authorization token is malformed.",
    );
  }

  try {
    if (!publicKey) {
      throw new Error("JWT public key is not loaded.");
    }

    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendAuthError(
        res,
        "TOKEN_EXPIRED",
        "Authorization token has expired.",
      );
    }

    if (
      error.name === "JsonWebTokenError" &&
      ["jwt malformed", "invalid token", "jwt must be provided"].includes(
        error.message,
      )
    ) {
      return sendAuthError(
        res,
        "TOKEN_MALFORMED",
        "Authorization token is malformed.",
      );
    }

    if (error.name === "JsonWebTokenError") {
      return sendAuthError(
        res,
        "TOKEN_INVALID",
        "Authorization token is invalid.",
      );
    }

    return next(error);
  }
};
