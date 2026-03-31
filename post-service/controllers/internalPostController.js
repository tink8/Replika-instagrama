import { postModel } from "../models/postModel.js";
import { AppError } from "../utils/errorHandler.js";

export const internalPostController = {
  getPostsByUsers: async (req, res, next) => {
    try {
      const userIdsParam = req.query.userIds;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);

      if (!userIdsParam) {
        throw new AppError(
          "Query parameter 'userIds' is required.",
          400,
          "MISSING_FIELDS",
        );
      }

      const userIds = userIdsParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!userIds.length) {
        throw new AppError(
          "Query parameter 'userIds' is required.",
          400,
          "MISSING_FIELDS",
        );
      }

      const offset = (page - 1) * limit;
      const { posts, total } = await postModel.getPostsByUserIds(
        userIds,
        limit,
        offset,
      );

      res.status(200).json({
        posts: posts.map((post) => ({
          id: post.id,
          userId: post.userId,
          description: post.description,
          media: post.media.map(({ id, url, type, order }) => ({
            id,
            url,
            type,
            order,
          })),
          createdAt: post.createdAt,
        })),
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },

  postExists: async (req, res, next) => {
    try {
      const owner = await postModel.findPostOwner(req.params.postId);
      if (!owner) {
        throw new AppError("Post not found.", 404, "POST_NOT_FOUND");
      }

      res.status(200).json({
        exists: true,
        ownerId: owner.userId,
      });
    } catch (error) {
      next(error);
    }
  },
};
