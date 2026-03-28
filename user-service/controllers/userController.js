import { userModel } from "../models/userModel.js";
import { AppError } from "../utils/errorHandler.js";
import minioClient from "../utils/minioClient.js";
import { config } from "../config/env.js";
import {
  socialServiceClient,
  postServiceClient,
} from "../utils/serviceClients.js";

const formatUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  isPrivate: Boolean(user.isPrivate),
});

export const userController = {
  getMe: async (req, res, next) => {
    try {
      const userId = req.userId; // Extracted from JWT
      const user = await userModel.findUserById(userId);
      if (!user)
        throw new AppError("User profile not found.", 404, "USER_NOT_FOUND");

      res.status(200).json(formatUserResponse(user));
    } catch (error) {
      next(error);
    }
  },

  updateMe: async (req, res, next) => {
    try {
      const userId = req.userId;
      const { name, username, bio, isPrivate } = req.body;

      if (
        name === undefined &&
        username === undefined &&
        bio === undefined &&
        isPrivate === undefined
      ) {
        throw new AppError(
          "At least one field must be provided for update.",
          400,
          "NO_FIELDS",
        );
      }

      if (username) {
        const existing = await userModel.findUserByUsername(username);
        if (existing && existing.id !== userId) {
          throw new AppError(
            "This username is already in use.",
            409,
            "USERNAME_TAKEN",
          );
        }
      }

      await userModel.updateUserProfile(userId, {
        name,
        username,
        bio,
        isPrivate,
      });
      const updatedUser = await userModel.findUserById(userId);
      res.status(200).json(formatUserResponse(updatedUser));
    } catch (error) {
      next(error);
    }
  },

  uploadAvatar: async (req, res, next) => {
    try {
      const userId = req.userId;
      if (!req.file)
        throw new AppError("An image file is required.", 400, "NO_FILE");

      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const bucket = config.minio.bucketName;

      // Upload to MinIO
      await minioClient.putObject(
        bucket,
        fileName,
        req.file.buffer,
        req.file.size,
        {
          "Content-Type": req.file.mimetype,
        },
      );

      // Construct public URL
      const protocol = config.minio.useSSL ? "https" : "http";
      const avatarUrl = `${protocol}://${config.minio.endPoint}:${config.minio.port}/${bucket}/${fileName}`;

      await userModel.updateUserAvatar(userId, avatarUrl);
      res.status(200).json({ avatarUrl });
    } catch (error) {
      next(error);
    }
  },

  deleteAvatar: async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await userModel.findUserById(userId);

      if (!user || !user.avatarUrl) {
        throw new AppError(
          "No profile picture to remove.",
          404,
          "AVATAR_NOT_FOUND",
        );
      }

      // Extract filename from URL and delete from MinIO
      const fileName = user.avatarUrl.split("/").pop();
      await minioClient.removeObject(config.minio.bucketName, fileName);

      await userModel.removeUserAvatar(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  searchUsers: async (req, res, next) => {
    try {
      const requesterId = req.userId;
      const token = req.token; // Forward JWT for Zero Trust
      const { q, page = 1, limit = 20 } = req.query;

      if (!q)
        throw new AppError(
          "Search query parameter 'q' is required.",
          400,
          "MISSING_QUERY",
        );

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { users, total } = await userModel.searchUsers(
        q,
        parseInt(limit),
        offset,
      );

      // Filter out blocked users by checking access via Social Service
      const validUsers = [];
      for (const user of users) {
        if (user.id === requesterId) {
          validUsers.push(user);
          continue;
        }
        const access = await socialServiceClient.checkAccess(user.id, token);
        // If reason is blocked_by_target or blocked_by_requester, we skip them
        if (!access.reason.includes("blocked")) {
          validUsers.push(user);
        }
      }

      res.status(200).json({
        users: validUsers,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  getUserProfile: async (req, res, next) => {
    try {
      const requesterId = req.userId;
      const token = req.token; // Forward JWT for Zero Trust
      const targetUserId = req.params.userId;

      const user = await userModel.findUserById(targetUserId);
      if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

      // 1. Check Access (Social Service)
      const access = await socialServiceClient.checkAccess(targetUserId, token);
      if (access.reason.includes("blocked")) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND"); // Hide existence if blocked
      }

      // 2. Get Counts & Status (Social Service)
      const counts = await socialServiceClient.getCounts(targetUserId, token);
      const followStatus = await socialServiceClient.getFollowStatus(
        targetUserId,
        token,
      );

      // 3. Get Posts if access is granted (Post Service)
      let posts = null;
      if (access.hasAccess) {
        posts = await postServiceClient.getUserPosts(targetUserId, token);
      }

      res.status(200).json({
        ...formatUserResponse(user),
        followerCount: counts.followerCount,
        followingCount: counts.followingCount,
        followStatus: followStatus,
        posts: posts,
      });
    } catch (error) {
      next(error);
    }
  },
};
