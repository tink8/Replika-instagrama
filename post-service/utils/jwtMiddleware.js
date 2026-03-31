import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { AppError } from "./errorHandler.js";

const extractBearerToken = (authHeader) => {
  if (!authHeader) {
    throw new AppError(
      "Authorization token is required.",
      401,
      "TOKEN_MISSING",
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new AppError("Authorization token is invalid.", 401, "TOKEN_INVALID");
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) {
    throw new AppError("Authorization token is invalid.", 401, "TOKEN_INVALID");
  }

  return token;
};

const verifyJwt = (token) => {
  try {
    return jwt.verify(token, config.jwtPublicKey, {
      algorithms: ["RS256"],
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError(
        "Authorization token has expired.",
        401,
        "TOKEN_EXPIRED",
      );
    }

    throw new AppError("Authorization token is invalid.", 401, "TOKEN_INVALID");
  }
};

export const requireAuth = (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const decoded = verifyJwt(token);

    req.userId = decoded.userId;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};
