import axios from "axios";
import { config } from "../config/env.js";

const createInternalClient = (baseURL) => axios.create({ baseURL });

export const socialServiceClient = {
  checkAccess: async (targetUserId, requesterId, token) => {
    try {
      const client = createInternalClient(config.services.socialServiceUrl);
      const response = await client.get(
        `/internal/social/check-access/${targetUserId}`,
        {
          headers: { "X-User-Id": requesterId },
        },
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { hasAccess: false, reason: "not_found" };
      }
      throw error;
    }
  },
};

export const interactionServiceClient = {
  getCounts: async (postId, userId) => {
    try {
      const client = createInternalClient(
        config.services.interactionServiceUrl,
      );
      const response = await client.get("/internal/interactions/counts/batch", {
        params: { postIds: postId, userId },
      });
      return (
        response.data.counts[0] || {
          postId,
          likeCount: 0,
          commentCount: 0,
          isLiked: false,
        }
      );
    } catch (error) {
      return { postId, likeCount: 0, commentCount: 0, isLiked: false };
    }
  },

  getCountsBatch: async (postIds, userId) => {
    if (!postIds.length) return [];

    try {
      const client = createInternalClient(
        config.services.interactionServiceUrl,
      );
      const response = await client.get("/internal/interactions/counts/batch", {
        params: { postIds: postIds.join(","), userId },
      });
      return response.data.counts || [];
    } catch (error) {
      return postIds.map((postId) => ({
        postId,
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
      }));
    }
  },
};
