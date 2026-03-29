import { interactionModel } from "../models/interactionModel.js";
import { AppError } from "../utils/errorHandler.js";
import { postServiceClient } from "../utils/serviceClients.js";

export const internalInteractionController = {
  getCountsForPost: async (req, res, next) => {
    try {
      const post = await postServiceClient.getPostExists(req.params.postId);
      if (!post?.exists) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      const counts = await interactionModel.getCountsForPost(req.params.postId);
      res.status(200).json({
        postId: req.params.postId,
        likeCount: counts.likeCount,
        commentCount: counts.commentCount,
      });
    } catch (error) {
      next(error);
    }
  },

  getBatchCounts: async (req, res, next) => {
    try {
      const postIdsParam = req.query.postIds;
      if (!postIdsParam) {
        throw new AppError(
          "Query parameter 'postIds' is required.",
          400,
          "MISSING_FIELDS",
        );
      }

      const postIds = postIdsParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!postIds.length) {
        throw new AppError(
          "Query parameter 'postIds' is required.",
          400,
          "MISSING_FIELDS",
        );
      }

      const userId = req.query.userId || null;
      const counts = await interactionModel.getCountsForPostIds(
        postIds,
        userId,
      );
      res.status(200).json({ counts });
    } catch (error) {
      next(error);
    }
  },

  purgeInteractions: async (req, res, next) => {
    try {
      const { userA, userB } = req.query;
      if (!userA || !userB) {
        throw new AppError(
          "Query parameters 'userA' and 'userB' are required.",
          400,
          "MISSING_FIELDS",
        );
      }

      await interactionModel.purgeBetweenUsers(userA, userB);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
