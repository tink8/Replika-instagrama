import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { Post } from "../types/api";
import { apiClient } from "../utils/apiClient";
import MediaCarousel from "./MediaCarousel";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const previousIsLiked = isLiked;
    const previousCount = likeCount;

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
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      console.error("Failed to toggle like", error);
    } finally {
      setIsLiking(false);
    }
  };

  const profileHref = post.user?.id
    ? `/profile/${post.user.id}`
    : post.userId
      ? `/profile/${post.userId}`
      : null;

  return (
    <article className="post-card">
      <header className="post-card-header">
        <div className="post-card-user">
          <div className="avatar avatar-small">
            {post.user?.avatarUrl ? (
              <img
                src={post.user.avatarUrl}
                alt={post.user.username}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-fallback">
                {(post.user?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            {profileHref ? (
              <Link to={profileHref} className="post-card-username">
                {post.user?.username || "Profile"}
              </Link>
            ) : (
              <span className="post-card-username">Post</span>
            )}
            <div className="post-card-date">
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <MediaCarousel media={post.media} />

      <div className="post-card-body">
        <div className="post-card-actions">
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`icon-action ${isLiked ? "is-active" : ""}`}
            disabled={isLiking}
            aria-label={isLiked ? "Unlike post" : "Like post"}
          >
            <Heart
              className="icon-action-icon"
              fill={isLiked ? "var(--danger)" : "none"}
              stroke={isLiked ? "var(--danger)" : "currentColor"}
            />
            {likeCount > 0 && <span className="action-count">{likeCount}</span>}
          </button>

          <Link
            to={`/post/${post.id}`}
            className="icon-action"
            aria-label="Open post"
          >
            <MessageCircle className="icon-action-icon" />
            {post.commentCount > 0 && (
              <span className="action-count">{post.commentCount}</span>
            )}
          </Link>
        </div>

        {post.description && (
          <p className="post-description">
            {post.user?.username && (
              <span className="post-description-user">
                {post.user.username}
              </span>
            )}
            {post.description}
          </p>
        )}

        <Link to={`/post/${post.id}`} className="subtle-link">
          {post.commentCount > 0
            ? `View all ${post.commentCount} comments`
            : "Open comments"}
        </Link>
      </div>
    </article>
  );
}
