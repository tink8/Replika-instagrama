import { v4 as uuidv4 } from "uuid";
import {
  findUserByEmailOrUsername,
  createUser,
  saveRefreshToken,
  findUserById,
  findRefreshToken,
  deleteRefreshToken,
} from "../models/userModel.js";
import { hashPassword, comparePassword } from "../utils/hashUtils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/jwtUtils.js";
import axios from "axios";
import { AppError } from "../utils/errorHandler.js";

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:8002";
const INVALID_CREDENTIALS_MESSAGE = "Invalid username/email or password.";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const register = async (req, res, next) => {
  try {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      throw new AppError(
        "Fields name, username, email, and password are required.",
        400,
        "MISSING_FIELDS",
      );
    }

    if (!isValidEmail(email)) {
      throw new AppError("Email address is not valid.", 400, "INVALID_EMAIL");
    }

    if (password.length < 8) {
      throw new AppError(
        "Password must be at least 8 characters.",
        400,
        "WEAK_PASSWORD",
      );
    }

    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError(
          "This email is already registered.",
          409,
          "EMAIL_TAKEN",
        );
      }

      throw new AppError(
        "This username is already in use.",
        409,
        "USERNAME_TAKEN",
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    try {
      await axios.post(`${USER_SERVICE_URL}/internal/users`, {
        id: userId,
        name,
        username,
        email,
      });
    } catch (error) {
      const status = error.response?.status;
      const upstreamError = error.response?.data?.error;

      if (status === 409 && upstreamError?.code && upstreamError?.message) {
        throw new AppError(upstreamError.message, 409, upstreamError.code);
      }

      if (status === 400 && upstreamError?.code && upstreamError?.message) {
        throw new AppError(upstreamError.message, 400, upstreamError.code);
      }

      console.error(
        "Failed to create user profile in User Service:",
        error.message,
      );
      throw new AppError(
        "Unable to create user profile. Please try again.",
        502,
        "SERVICE_UNAVAILABLE",
      );
    }

    await createUser(userId, email, username, passwordHash);

    res.status(201).json({
      message: "User registered successfully.",
      userId,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { login: loginInput, password } = req.body;

    if (!loginInput || !password) {
      throw new AppError(
        "Fields login and password are required.",
        400,
        "MISSING_FIELDS",
      );
    }

    const user = await findUserByEmailOrUsername(loginInput, loginInput);
    if (!user) {
      throw new AppError(
        INVALID_CREDENTIALS_MESSAGE,
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(
        INVALID_CREDENTIALS_MESSAGE,
        401,
        "INVALID_CREDENTIALS",
      );
    }

    try {
      const endpoint = loginInput.includes("@")
        ? `/internal/users/by-email/${loginInput}`
        : `/internal/users/by-username/${loginInput}`;

      await axios.get(`${USER_SERVICE_URL}${endpoint}`);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new AppError(
          INVALID_CREDENTIALS_MESSAGE,
          401,
          "INVALID_CREDENTIALS",
        );
      }

      console.error(
        "Failed to verify user profile in User Service:",
        error.message,
      );
      throw new AppError(
        "Unable to complete login. Please try again.",
        502,
        "SERVICE_UNAVAILABLE",
      );
    }

    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id);
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await saveRefreshToken(tokenId, user.id, refreshToken, expiresAt);

    res.status(200).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      throw new AppError("Refresh token is required.", 400, "MISSING_FIELDS");
    }

    const tokenRecord = await findRefreshToken(refreshTokenValue);
    if (!tokenRecord) {
      throw new AppError(
        "Refresh token is invalid or expired.",
        401,
        "INVALID_TOKEN",
      );
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await deleteRefreshToken(refreshTokenValue);
      throw new AppError(
        "Refresh token is invalid or expired.",
        401,
        "INVALID_TOKEN",
      );
    }

    let decoded;
    try {
      decoded = verifyToken(refreshTokenValue);
    } catch (err) {
      throw new AppError(
        "Refresh token is invalid or expired.",
        401,
        "INVALID_TOKEN",
      );
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      throw new AppError(
        "Refresh token is invalid or expired.",
        401,
        "INVALID_TOKEN",
      );
    }

    const newAccessToken = generateAccessToken(user.id, user.username);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      throw new AppError("Refresh token is required.", 400, "MISSING_FIELDS");
    }

    const result = await deleteRefreshToken(refreshTokenValue);
    if (!result.affectedRows) {
      throw new AppError("Refresh token is invalid.", 401, "INVALID_TOKEN");
    }

    res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};
