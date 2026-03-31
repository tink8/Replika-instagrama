import axios from "axios";
import { config } from "../config/env.js";

// Helper to create an axios instance with the Bearer token for user-facing endpoints
const createAuthClient = (baseURL, token) => {
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Helper to create an axios instance for internal service-to-service calls (no auth needed)
const createInternalClient = (baseURL) => {
  return axios.create({ baseURL });
};

export const socialServiceClient = {
  // Check if requester has access to target user (handles blocks, privacy, following)
  checkAccess: async (targetUserId, requesterId, token) => {
    try {
      const client = createInternalClient(config.services.socialServiceUrl);
      const response = await client.get(
        `/internal/social/check-access/${targetUserId}`,
        {
          headers: { "X-User-Id": requesterId },
        },
      );
      return response.data; // { hasAccess: boolean, reason: string }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return { hasAccess: false, reason: "not_found" };
      }
      throw error;
    }
  },

  // Get follower and following counts
  getCounts: async (userId, token) => {
    try {
      const client = createAuthClient(config.services.socialServiceUrl, token);
      const response = await client.get(`/api/social/counts/${userId}`);
      return response.data; // { followerCount: number, followingCount: number }
    } catch (error) {
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // Get follow status (none, following, requested, blocked_by_you, blocked_by_them)
  getFollowStatus: async (userId, token) => {
    try {
      const client = createAuthClient(config.services.socialServiceUrl, token);
      const response = await client.get(`/api/social/follow/status/${userId}`);
      return response.data.status;
    } catch (error) {
      return "none";
    }
  },
};

export const postServiceClient = {
  // Get a user's posts (gallery view)
  getUserPosts: async (userId, token) => {
    try {
      const client = createAuthClient(config.services.postServiceUrl, token);
      const response = await client.get(`/api/posts/user/${userId}`);
      return response.data.posts;
    } catch (error) {
      return [];
    }
  },

  // Get total post count for a user via internal route (no auth needed)
  getUserPostCount: async (userId) => {
    try {
      const client = createInternalClient(config.services.postServiceUrl);
      const response = await client.get(
        `/internal/posts/by-users?userIds=${userId}&limit=1`,
      );
      // With limit=1, totalPages equals the total number of posts
      return response.data.totalPages ?? 0;
    } catch (error) {
      return 0;
    }
  },
};
