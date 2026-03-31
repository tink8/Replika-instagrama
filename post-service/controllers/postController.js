import { v4 as uuidv4 } from "uuid";
import { postModel } from "../models/postModel.js";
import minioClient from "../utils/minioClient.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/errorHandler.js";
import {
  socialServiceClient,
  interactionServiceClient,
} from "../utils/serviceClients.js";

const toMediaType = (mimetype) =>
  mimetype.startsWith("video/") ? "video" : "image";

const toPublicMedia = (media) => ({
  id: media.id,
  url: media.url,
  type: media.type,
  order: media.order,
});

const serializePost = (
  post,
  counts = { likeCount: 0, commentCount: 0, isLiked: false },
) => ({
  id: post.id,
  userId: post.userId,
  description: post.description,
  media: post.media.map(toPublicMedia),
  likeCount: counts.likeCount ?? 0,
  commentCount: counts.commentCount ?? 0,
  isLiked: Boolean(counts.isLiked),
  createdAt: post.createdAt,
});

const serializeUserGalleryPost = (
  post,
  counts = { likeCount: 0, commentCount: 0, isLiked: false },
) => ({
  id: post.id,
  description: post.description,
  media: post.media.map(toPublicMedia),
  likeCount: counts.likeCount ?? 0,
  commentCount: counts.commentCount ?? 0,
  isLiked: Boolean(counts.isLiked),
  createdAt: post.createdAt,
});

const buildObjectKey = (userId, index, originalName) => {
  const extension = originalName.includes(".")
    ? originalName.split(".").pop()
    : "bin";
  return `${userId}/${Date.now()}-${index}-${uuidv4()}.${extension}`;
};

const mapAccessErrorForPost = (reason) => {
  if (reason.includes("blocked") || reason === "not_found") {
    return new AppError("Post not found.", 404, "POST_NOT_FOUND");
  }

  return new AppError(
    "You do not have access to this post.",
    403,
    "ACCESS_DENIED",
  );
};

const mapAccessErrorForUserPosts = (reason) => {
  if (reason.includes("blocked") || reason === "not_found") {
    return new AppError("User not found.", 404, "USER_NOT_FOUND");
  }

  return new AppError("This profile is private.", 403, "ACCESS_DENIED");
};

export const postController = {
  createPost: async (req, res, next) => {
    const uploadedObjectKeys = [];

    try {
      const userId = req.userId;
      const description = req.body.description ?? null;
      const files = req.files || [];

      if (!files.length) {
        throw new AppError(
          "At least one image or video is required.",
          400,
          "NO_MEDIA",
        );
      }

      if (files.length > 20) {
        throw new AppError(
          "A post can contain a maximum of 20 media items.",
          400,
          "TOO_MANY_MEDIA",
        );
      }

      const postId = uuidv4();
      const bucket = config.minio.bucketName;
      const media = [];

      for (const [index, file] of files.entries()) {
        const objectKey = buildObjectKey(userId, index, file.originalname);
        uploadedObjectKeys.push(objectKey);

        await minioClient.putObject(bucket, objectKey, file.buffer, file.size, {
          "Content-Type": file.mimetype,
        });

        const protocol = config.minio.useSSL ? "https" : "http";
        const externalEndpoint =
          process.env.MINIO_PUBLIC_ENDPOINT || "localhost";
        const url = `${protocol}://${externalEndpoint}:${config.minio.port}/${bucket}/${objectKey}`;

        media.push({
          id: uuidv4(),
          url,
          type: toMediaType(file.mimetype),
          order: index,
          objectKey,
        });
      }

      await postModel.createPost({
        postId,
        userId,
        description,
        media,
      });

      const createdPost = await postModel.findPostById(postId);
      res.status(201).json({
        id: createdPost.id,
        description: createdPost.description,
        media: createdPost.media.map(toPublicMedia),
        createdAt: createdPost.createdAt,
      });
    } catch (error) {
      for (const objectKey of uploadedObjectKeys) {
        try {
          await minioClient.removeObject(config.minio.bucketName, objectKey);
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup uploaded object:",
            cleanupError.message,
          );
        }
      }
      next(error);
    }
  },

  getPost: async (req, res, next) => {
    try {
      const post = await postModel.findPostById(req.params.postId);
      if (!post) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      const access =
        req.userId === post.userId
          ? { hasAccess: true, reason: "own_profile" }
          : await socialServiceClient.checkAccess(
              post.userId,
              req.userId,
              req.token,
            );

      if (!access.hasAccess) {
        throw mapAccessErrorForPost(access.reason);
      }

      const counts = await interactionServiceClient.getCounts(
        post.id,
        req.userId,
      );
      res.status(200).json(serializePost(post, counts));
    } catch (error) {
      next(error);
    }
  },

  updatePost: async (req, res, next) => {
    try {
      if (!Object.prototype.hasOwnProperty.call(req.body, "description")) {
        throw new AppError("Description field is required.", 400, "NO_FIELDS");
      }

      const post = await postModel.findPostById(req.params.postId);
      if (!post) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      if (post.userId !== req.userId) {
        throw new AppError(
          "You can only edit your own posts.",
          403,
          "ACCESS_DENIED",
        );
      }

      await postModel.updatePostDescription(
        req.params.postId,
        req.body.description,
      );
      const updatedPost = await postModel.findPostById(req.params.postId);
      const counts = await interactionServiceClient.getCounts(
        updatedPost.id,
        req.userId,
      );
      res.status(200).json(serializePost(updatedPost, counts));
    } catch (error) {
      next(error);
    }
  },

  deletePost: async (req, res, next) => {
    try {
      const post = await postModel.findPostById(req.params.postId);
      if (!post) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      if (post.userId !== req.userId) {
        throw new AppError(
          "You can only delete your own posts.",
          403,
          "ACCESS_DENIED",
        );
      }

      for (const media of post.media) {
        try {
          await minioClient.removeObject(
            config.minio.bucketName,
            media.objectKey,
          );
        } catch (cleanupError) {
          console.error(
            "Failed to remove media from storage:",
            cleanupError.message,
          );
        }
      }

      await postModel.deletePost(req.params.postId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  deleteMedia: async (req, res, next) => {
    try {
      const post = await postModel.findPostById(req.params.postId);
      if (!post) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      if (post.userId !== req.userId) {
        throw new AppError(
          "You can only modify your own posts.",
          403,
          "ACCESS_DENIED",
        );
      }

      const media = await postModel.findMediaById(
        req.params.postId,
        req.params.mediaId,
      );
      if (!media) {
        throw new AppError(
          "Media item not found in this post.",
          404,
          "MEDIA_NOT_FOUND",
        );
      }

      try {
        await minioClient.removeObject(
          config.minio.bucketName,
          media.objectKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove media from storage:",
          cleanupError.message,
        );
      }

      await postModel.deleteMedia(req.params.mediaId);
      const remainingMediaCount = await postModel.countMediaForPost(
        req.params.postId,
      );

      if (remainingMediaCount === 0) {
        await postModel.deletePost(req.params.postId);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  getUserPosts: async (req, res, next) => {
    try {
      const targetUserId = req.params.userId;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 12);
      const offset = (page - 1) * limit;

      const access =
        req.userId === targetUserId
          ? { hasAccess: true, reason: "own_profile" }
          : await socialServiceClient.checkAccess(
              targetUserId,
              req.userId,
              req.token,
            );

      if (!access.hasAccess) {
        throw mapAccessErrorForUserPosts(access.reason);
      }

      const { posts, total } = await postModel.getUserPosts(
        targetUserId,
        limit,
        offset,
      );

      const counts = await interactionServiceClient.getCountsBatch(
        posts.map((post) => post.id),
        req.userId,
      );
      const countsMap = new Map(counts.map((item) => [item.postId, item]));

      res.status(200).json({
        posts: posts.map((post) =>
          serializeUserGalleryPost(post, countsMap.get(post.id) || undefined),
        ),
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },
};
