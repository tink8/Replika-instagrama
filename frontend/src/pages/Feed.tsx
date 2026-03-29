import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../utils/apiClient";
import type { FeedResponse } from "../types/api";
import PostCard from "../components/PostCard";

export default function Feed() {
  const [feedData, setFeedData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const data = await apiClient<FeedResponse>("/api/feed");
        setFeedData(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load feed. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto bg-red-50 border border-red-200 text-red-600 p-4 rounded-sm text-center">
        {error}
      </div>
    );
  }

  if (!feedData || feedData.posts.length === 0) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-gray-300 p-8 rounded-sm text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to InstagramClone!
        </h3>
        <p className="text-gray-500 text-sm">
          When you follow people, you'll see the photos and videos they post
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {feedData.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
