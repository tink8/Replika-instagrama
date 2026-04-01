import { apiClient } from "../utils/apiClient";
import type { FeedResponse, UserProfile } from "../types/api";

export const api = {
  getFeed: async () => {
    const response = await apiClient<FeedResponse>("/api/feed");
    return response.posts;
  },

  getUserProfile: async (userId: string) => {
    return apiClient<UserProfile>(`/api/users/${userId}`);
  },
};
