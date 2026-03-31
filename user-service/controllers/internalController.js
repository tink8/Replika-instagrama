import { userModel } from "../models/userModel.js";
import { AppError } from "../utils/errorHandler.js";

export const internalController = {
  // POST /internal/users (Called by Auth Service on registration)
  createUserProfile: async (req, res, next) => {
    try {
      const { id, name, username, email } = req.body;

      if (!id || !name || !username || !email) {
        throw new AppError(
          "Fields id, name, username, and email are required.",
          400,
          "MISSING_FIELDS",
        );
      }

      // Check duplicates
      const existingUsername = await userModel.findUserByUsername(username);
      if (existingUsername)
        throw new AppError(
          "This username is already in use.",
          409,
          "USERNAME_TAKEN",
        );

      const existingEmail = await userModel.findUserByEmail(email);
      if (existingEmail)
        throw new AppError(
          "This email is already registered.",
          409,
          "EMAIL_TAKEN",
        );

      await userModel.createUser(id, name, username, email);
      res.status(201).json({ message: "User profile created successfully." });
    } catch (error) {
      next(error);
    }
  },

  // GET /internal/users/by-username/:username (Called by Auth Service on login)
  getUserByUsername: async (req, res, next) => {
    try {
      const user = await userModel.findUserByUsername(req.params.username);
      if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
      res
        .status(200)
        .json({ id: user.id, email: user.email, username: user.username });
    } catch (error) {
      next(error);
    }
  },

  // GET /internal/users/by-email/:email (Called by Auth Service on login)
  getUserByEmail: async (req, res, next) => {
    try {
      const user = await userModel.findUserByEmail(req.params.email);
      if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
      res
        .status(200)
        .json({ id: user.id, email: user.email, username: user.username });
    } catch (error) {
      next(error);
    }
  },

  // GET /internal/users/:userId (Called by Social Service)
  getUserById: async (req, res, next) => {
    try {
      const user = await userModel.findUserById(req.params.userId);
      if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

      res.status(200).json({
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPrivate: Boolean(user.isPrivate),
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /internal/users/batch (Called by Feed/Interaction services)
  getUsersBatch: async (req, res, next) => {
    try {
      const { userIds } = req.body;
      if (!userIds || !Array.isArray(userIds)) {
        throw new AppError(
          "Field userIds is required and must be an array.",
          400,
          "MISSING_FIELDS",
        );
      }

      const users = await userModel.getUsersBatch(userIds);
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  },
};
