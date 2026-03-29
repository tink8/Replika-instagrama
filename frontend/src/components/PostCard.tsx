import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "../types/api";
import { apiClient } from "../utils/apiClient";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  // Optimistic UI state for likes
  const [isLiked, setIsLiked] = useState(false); // Note: If your API returns 'isLikedByMe', initialize with that
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!previousIsLiked);
    setLikeCount(previousIsLiked ? previousCount - 1 : previousCount + 1);

    try {
      if (previousIsLiked) {
        await apiClient(`/api/interactions/likes/${post.id}`, {
          method: "DELETE",
        });
      } else {
        await apiClient(`/api/interactions/likes/${post.id}`, {
          method: "POST",
        });
      }
    } catch (error) {
      // Revert on failure
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      console.error("Failed to toggle like", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-sm mb-8 max-w-lg mx-auto overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center p-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
          {post.user?.avatarUrl ? (
            <img
              src={post.user.avatarUrl}
              alt={post.user.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-xs">
              {post.user?.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="ml-3 font-semibold text-sm text-gray-900">
          {post.user?.username || "Unknown User"}
        </span>
      </div>

      {/* Post Media (Showing first item for simplicity) */}
      {post.media.length > 0 && (
        <div className="bg-gray-100 aspect-square flex items-center justify-center overflow-hidden">
          {post.media[0].type === "video" ? (
            <video
              src={post.media[0].url}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={post.media[0].url}
              alt="Post content"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="p-3">
        <div className="flex space-x-4 mb-2">
          <button
            onClick={handleLikeToggle}
            className="focus:outline-none transition-transform active:scale-125"
          >
            <Heart
              className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : "text-gray-900 hover:text-gray-600"}`}
            />
          </button>
          <button className="focus:outline-none">
            <MessageCircle className="h-6 w-6 text-gray-900 hover:text-gray-600" />
          </button>
        </div>

        <div className="font-semibold text-sm text-gray-900 mb-1">
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </div>

        {/* Description */}
        {post.description && (
          <div className="text-sm text-gray-900">
            <span className="font-semibold mr-2">{post.user?.username}</span>
            {post.description}
          </div>
        )}

        {/* Comments Link */}
        {post.commentCount > 0 && (
          <div className="text-sm text-gray-500 mt-1 cursor-pointer hover:underline">
            View all {post.commentCount} comments
          </div>
        )}

        <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-2">
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
