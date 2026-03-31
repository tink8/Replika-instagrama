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

      if (username !== undefined) {
        if (!username.trim()) {
          throw new AppError(
            "Username cannot be empty.",
            400,
            "VALIDATION_ERROR",
          );
        }
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
      const externalEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || "localhost";
      const avatarUrl = `${protocol}://${externalEndpoint}:${config.minio.port}/${bucket}/${fileName}`;

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
        let access;
        try {
          access = await socialServiceClient.checkAccess(
            user.id,
            requesterId,
            token,
          );
        } catch (serviceError) {
          // Allow search to keep working when Social Service is temporarily unavailable.
          validUsers.push(user);
          continue;
        }

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

      let access;
      let counts = { followerCount: 0, followingCount: 0 };
      let followStatus = "none";

      try {
        counts = await socialServiceClient.getCounts(targetUserId, token);
      } catch (e) {}

      if (requesterId === targetUserId) {
        access = { hasAccess: true, reason: "own_profile" };
      } else {
        try {
          access = await socialServiceClient.checkAccess(
            targetUserId,
            requesterId,
            token,
          );
          if (access.reason.includes("blocked")) {
            throw new AppError("User not found.", 404, "USER_NOT_FOUND");
          }

          followStatus = await socialServiceClient.getFollowStatus(
            targetUserId,
            token,
          );
        } catch (serviceError) {
          if (serviceError instanceof AppError) {
            throw serviceError;
          }
          access = {
            hasAccess: !Boolean(user.isPrivate),
            reason: user.isPrivate ? "private_profile" : "service_unavailable",
          };
        }
      }

      let posts = null;
      if (access.hasAccess) {
        posts = await postServiceClient.getUserPosts(targetUserId, token);
      }

      // Always fetch post count via internal route (no access check)
      const postCount = await postServiceClient.getUserPostCount(targetUserId);

      res.status(200).json({
        ...formatUserResponse(user),
        followerCount: counts.followerCount,
        followingCount: counts.followingCount,
        followStatus: followStatus,
        postCount: postCount,
        posts: posts,
      });
    } catch (error) {
      next(error);
    }
  },
};
