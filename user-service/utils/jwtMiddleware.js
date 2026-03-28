import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { AppError } from "./errorHandler.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError("Authorization token is required.", 401, "TOKEN_MISSING"),
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using the RS256 public key
    const decoded = jwt.verify(token, config.jwtPublicKey, {
      algorithms: ["RS256"],
    });

    // Attach the user ID and the raw token to the request object
    req.userId = decoded.userId;
    req.token = token; // We save this so we can forward it to other microservices

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError("Authorization token has expired.", 401, "TOKEN_EXPIRED"),
      );
    }
    return next(
      new AppError("Authorization token is invalid.", 401, "TOKEN_INVALID"),
    );
  }
};
