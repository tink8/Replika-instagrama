import { v4 as uuidv4 } from "uuid";
import { interactionModel } from "../models/interactionModel.js";
import { AppError } from "../utils/errorHandler.js";
import {
  postServiceClient,
  socialServiceClient,
  userServiceClient,
} from "../utils/serviceClients.js";

const serializeComment = (comment, user = {}) => ({
  id: comment.id,
  userId: comment.userId,
  username: user.username || "unknown",
  avatarUrl: user.avatarUrl ?? null,
  text: comment.text,
  createdAt: comment.createdAt,
});

const ensurePostAccessible = async (postId, requesterId) => {
  const post = await postServiceClient.getPostExists(postId);
  if (!post?.exists) {
    throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
  }

  if (requesterId !== post.ownerId) {
    const access = await socialServiceClient.checkAccess(
      post.ownerId,
      requesterId,
    );

    if (!access.hasAccess) {
      throw new AppError(
        "You do not have access to this post.",
        403,
        "ACCESS_DENIED",
      );
    }
  }

  return post;
};

const validateCommentText = (body) => {
  if (!Object.prototype.hasOwnProperty.call(body, "text")) {
    throw new AppError("Comment text is required.", 400, "MISSING_FIELDS");
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    throw new AppError("Comment text cannot be empty.", 400, "INVALID_FIELDS");
  }

  return body.text.trim();
};

export const interactionController = {
  likePost: async (req, res, next) => {
    try {
      const post = await ensurePostAccessible(req.params.postId, req.userId);
      const existingLike = await interactionModel.findLike(
        req.params.postId,
        req.userId,
      );

      if (existingLike) {
        throw new AppError(
          "You have already liked this post.",
          409,
          "ALREADY_LIKED",
        );
      }

      await interactionModel.createLike({
        id: uuidv4(),
        postId: req.params.postId,
        postOwnerId: post.ownerId,
        userId: req.userId,
      });

      res.status(201).json({ message: "Post liked." });
    } catch (error) {
      next(error);
    }
  },

  unlikePost: async (req, res, next) => {
    try {
      await ensurePostAccessible(req.params.postId, req.userId);
      const affectedRows = await interactionModel.deleteLike(
        req.params.postId,
        req.userId,
      );

      if (!affectedRows) {
        throw new AppError("You have not liked this post.", 404, "NOT_LIKED");
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  getLikeCount: async (req, res, next) => {
    try {
      await ensurePostAccessible(req.params.postId, req.userId);
      const likeCount = await interactionModel.getLikeCount(req.params.postId);

      res.status(200).json({
        postId: req.params.postId,
        likeCount,
      });
    } catch (error) {
      next(error);
    }
  },

  addComment: async (req, res, next) => {
    try {
      const post = await ensurePostAccessible(req.params.postId, req.userId);
      const text = validateCommentText(req.body);
      const comment = {
        id: uuidv4(),
        postId: req.params.postId,
        postOwnerId: post.ownerId,
        userId: req.userId,
        text,
        createdAt: new Date().toISOString(),
      };

      await interactionModel.createComment(comment);

      res.status(201).json({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        text: comment.text,
        createdAt: comment.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },

  getComments: async (req, res, next) => {
    try {
      await ensurePostAccessible(req.params.postId, req.userId);
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const offset = (page - 1) * limit;

      const { comments, total } = await interactionModel.getCommentsByPostId(
        req.params.postId,
        limit,
        offset,
      );

      const uniqueUserIds = [
        ...new Set(comments.map((comment) => comment.userId)),
      ];
      const users = await userServiceClient.getUsersBatch(uniqueUserIds);
      const usersMap = new Map(users.map((user) => [user.id, user]));

      res.status(200).json({
        comments: comments.map((comment) =>
          serializeComment(comment, usersMap.get(comment.userId)),
        ),
        page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
      });
    } catch (error) {
      next(error);
    }
  },

  updateComment: async (req, res, next) => {
    try {
      const text = validateCommentText(req.body);
      const comment = await interactionModel.findCommentById(
        req.params.commentId,
      );

      if (!comment) {
        throw new AppError("Comment not found.", 404, "COMMENT_NOT_FOUND");
      }

      if (comment.userId !== req.userId) {
        throw new AppError(
          "You can only edit your own comments.",
          403,
          "ACCESS_DENIED",
        );
      }

      await interactionModel.updateComment(req.params.commentId, text);
      const updatedComment = await interactionModel.findCommentById(
        req.params.commentId,
      );

      res.status(200).json({
        id: updatedComment.id,
        postId: updatedComment.postId,
        userId: updatedComment.userId,
        text: updatedComment.text,
        createdAt: updatedComment.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteComment: async (req, res, next) => {
    try {
      const comment = await interactionModel.findCommentById(
        req.params.commentId,
      );

      if (!comment) {
        throw new AppError("Comment not found.", 404, "COMMENT_NOT_FOUND");
      }

      if (comment.userId !== req.userId) {
        throw new AppError(
          "You can only delete your own comments.",
          403,
          "ACCESS_DENIED",
        );
      }

      await interactionModel.deleteComment(req.params.commentId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
