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

/**
 * Handles the registration of a new user.
 * Route: POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // 1. Basic Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        error: { message: "Email, username, and password are required" },
      });
    }

    // 2. Check if user already exists
    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      const conflictField = existingUser.email === email ? "Email" : "Username";
      return res.status(409).json({
        error: { message: `${conflictField} is already in use` },
      });
    }

    // 3. Hash the password securely
    const passwordHash = await hashPassword(password);

    // 4. Generate a unique UUID for the user
    const userId = uuidv4();

    // 5. Save the user to the database
    await createUser(userId, email, username, passwordHash);

    // TODO: In the future, we will make an HTTP call to the User Service here
    // to create the user's public profile (bio, profile picture, etc.)

    // 6. Send success response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: userId,
        email,
        username,
      },
    });
  } catch (error) {
    // Pass any unexpected errors to the global error handler in app.js
    next(error);
  }
};

/**
 * Handles user login.
 * Route: POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    // 1. Basic Validation
    if (!identifier || !password) {
      return res.status(400).json({
        error: { message: "Email/Username and password are required" },
      });
    }

    // 2. Find user by email or username
    const user = await findUserByEmailOrUsername(identifier, identifier);
    if (!user) {
      return res.status(401).json({
        error: { message: "Invalid credentials" },
      });
    }

    // 3. Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: { message: "Invalid credentials" },
      });
    }

    // 4. Generate JWTs
    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id);

    // 5. Save refresh token to database
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await saveRefreshToken(tokenId, user.id, refreshToken, expiresAt);

    // 6. Send response
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refreshes an access token using a valid refresh token.
 * Route: POST /api/auth/refresh
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: { message: "Refresh token is required" },
      });
    }

    // 1. Check if token exists in the database
    const tokenRecord = await findRefreshToken(refreshToken);
    if (!tokenRecord) {
      return res.status(401).json({
        error: { message: "Invalid refresh token" },
      });
    }

    // 2. Check if token is expired in the database
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await deleteRefreshToken(refreshToken);
      return res.status(401).json({
        error: { message: "Refresh token has expired. Please log in again." },
      });
    }

    // 3. Verify the JWT signature
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        error: { message: "Invalid or expired token signature" },
      });
    }

    // 4. Find the user to get their username for the new access token
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: { message: "User associated with this token no longer exists" },
      });
    }

    // 5. Generate a new access token
    const newAccessToken = generateAccessToken(user.id, user.username);

    // 6. Send response
    res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs a user out by deleting their refresh token.
 * Route: POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: { message: "Refresh token is required" },
      });
    }

    // Delete the token from the database
    await deleteRefreshToken(refreshToken);

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
