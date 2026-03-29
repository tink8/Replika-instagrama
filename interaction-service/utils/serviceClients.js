import axios from "axios";
import { config } from "../config/env.js";

const createInternalClient = (baseURL) => axios.create({ baseURL });

export const postServiceClient = {
  getPostExists: async (postId) => {
    try {
      const client = createInternalClient(config.services.postServiceUrl);
      const response = await client.get(`/internal/posts/${postId}/exists`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

export const socialServiceClient = {
  checkAccess: async (targetUserId, requesterId) => {
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

export const userServiceClient = {
  getUsersBatch: async (userIds) => {
    if (!userIds.length) return [];

    const client = createInternalClient(config.services.userServiceUrl);
    const response = await client.post("/internal/users/batch", { userIds });
    return response.data.users || [];
  },
};
