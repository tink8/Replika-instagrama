import axios from "axios";
import { config } from "../config/env.js";

// Helper to create an axios instance with the Bearer token for Zero Trust
const createClient = (baseURL, token) => {
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const socialServiceClient = {
  // Check if requester has access to target user (handles blocks, privacy, following)
  checkAccess: async (targetUserId, token) => {
    try {
      const client = createClient(config.services.socialServiceUrl, token);
      const response = await client.get(
        `/internal/social/check-access/${targetUserId}`,
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
      const client = createClient(config.services.socialServiceUrl, token);
      const response = await client.get(`/api/social/counts/${userId}`);
      return response.data; // { followerCount: number, followingCount: number }
    } catch (error) {
      return { followerCount: 0, followingCount: 0 };
    }
  },

  // Get follow status (none, following, requested, blocked_by_you, blocked_by_them)
  getFollowStatus: async (userId, token) => {
    try {
      const client = createClient(config.services.socialServiceUrl, token);
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
      const client = createClient(config.services.postServiceUrl, token);
      const response = await client.get(`/api/posts/user/${userId}`);
      return response.data.posts;
    } catch (error) {
      return [];
    }
  },
};
