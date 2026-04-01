import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart, Loader2, PencilLine, Save, Trash2, X } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";
import type { Post, UserProfile } from "../types/api";
import { useAuth } from "../context/AuthContext";
import CommentSection from "../components/CommentSection";
import MediaCarousel from "../components/MediaCarousel";

export default function SinglePost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Custom confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    text: string;
    dangerLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const isOwnPost = Boolean(user?.id && post?.userId === user.id);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Post not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await apiClient<Post>(
          `/api/posts/${postId}?_t=${Date.now()}`,
        );
        let enrichedPost = data;

        if (data.userId) {
          try {
            const author = await apiClient<UserProfile>(
              `/api/users/${data.userId}`,
            );
            enrichedPost = {
              ...data,
              user: {
                id: author.id,
                username: author.username,
                avatarUrl: author.avatarUrl,
              },
            };
          } catch (authorError) {
            console.error("Failed to enrich post author", authorError);
          }
        }

        setPost(enrichedPost);
        setDraftDescription(enrichedPost.description ?? "");
        setLikeCount(enrichedPost.likeCount);
        setIsLiked(Boolean(enrichedPost.isLiked));
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Failed to load post.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPost();
  }, [postId]);

  const handleLikeToggle = async () => {
    if (!post || isLiking) return;

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
    } catch (likeError) {
      console.error("Failed to toggle like", likeError);
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!post || !isOwnPost) return;

    setIsSavingDescription(true);
    setError("");
    try {
      const updatedPost = await apiClient<Post>(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: draftDescription }),
      });

      setPost((currentPost) =>
        currentPost
          ? {
              ...currentPost,
              description: updatedPost.description,
            }
          : currentPost,
      );
      setDraftDescription(updatedPost.description ?? "");
      setIsEditingDescription(false);
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message);
      } else {
        setError("Failed to update post.");
      }
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleDeletePost = () => {
    if (!post || !isOwnPost) return;
    setConfirmAction({
      title: "Delete post?",
      text: "This will permanently delete this post and all its comments.",
      dangerLabel: "Delete",
      onConfirm: async () => {
        setConfirmAction(null);
        setIsDeletingPost(true);
        setError("");
        try {
          await apiClient(`/api/posts/${post.id}`, { method: "DELETE" });
          navigate(user?.id ? `/profile/${user.id}` : "/");
        } catch (deleteError) {
          if (deleteError instanceof ApiError) {
            setError(deleteError.message);
          } else {
            setError("Failed to delete post.");
          }
          setIsDeletingPost(false);
        }
      },
    });
  };

  const handleRemoveCurrentMedia = (mediaId: string) => {
    if (!post || !isOwnPost || removingMediaId) return;

    const isLastMedia = post.media.length === 1;
    setConfirmAction({
      title: isLastMedia ? "Delete post?" : "Remove media?",
      text: isLastMedia
        ? "This is the last media item. Removing it will delete the entire post."
        : "Remove this media item from the post?",
      dangerLabel: "Remove",
      onConfirm: async () => {
        setConfirmAction(null);
        setRemovingMediaId(mediaId);
        setError("");
        try {
          await apiClient(`/api/posts/${post.id}/media/${mediaId}`, {
            method: "DELETE",
          });

          if (isLastMedia) {
            navigate(user?.id ? `/profile/${user.id}` : "/");
            return;
          }

          setPost((currentPost) =>
            currentPost
              ? {
                  ...currentPost,
                  media: currentPost.media.filter((m) => m.id !== mediaId),
                }
              : currentPost,
          );
        } catch (removeError) {
          if (removeError instanceof ApiError) {
            setError(removeError.message);
          } else {
            setError("Failed to remove media item.");
          }
        } finally {
          setRemovingMediaId(null);
        }
      },
    });
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="post-overlay">
        <div className="post-overlay-backdrop" />
        <div className="post-overlay-loading">
          <Loader2 className="spinner-icon" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="error-banner page-banner">
        {error || "Post not found."}
      </div>
    );
  }

  return (
    <>
      <div className="post-overlay">
        <div className="post-overlay-backdrop" onClick={handleClose} />

        {/* Close button */}
        <button
          type="button"
          className="post-overlay-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <section className="single-post-card">
          {error ? (
            <div className="error-banner compact-banner">{error}</div>
          ) : null}

          <div className="single-post-media">
            <MediaCarousel
              media={post.media}
              label="Selected post media"
              removeLabel="Remove this media"
              canRemoveCurrent={isOwnPost}
              isRemovingCurrent={Boolean(removingMediaId)}
              onRemoveCurrent={handleRemoveCurrentMedia}
              frameClassName="single-post-media-frame"
              contentClassName="single-post-media-content"
            />
          </div>

          <div className="single-post-sidebar">
            <header className="single-post-header">
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
                  {post.user ? (
                    <Link
                      to={`/profile/${post.user.id}`}
                      className="post-card-username"
                    >
                      {post.user.username}
                    </Link>
                  ) : (
                    <span className="post-card-username">Post</span>
                  )}
                </div>
              </div>

              {isOwnPost ? (
                <div className="post-owner-actions">
                  <button
                    type="button"
                    className="post-owner-btn"
                    onClick={() => {
                      setDraftDescription(post.description ?? "");
                      setIsEditingDescription((current) => !current);
                    }}
                    aria-label={
                      isEditingDescription ? "Cancel edit" : "Edit caption"
                    }
                  >
                    {isEditingDescription ? (
                      <X size={20} />
                    ) : (
                      <PencilLine size={20} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="post-owner-btn post-owner-btn-danger"
                    onClick={handleDeletePost}
                    disabled={isDeletingPost}
                    aria-label="Delete post"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ) : null}
            </header>

            <div className="single-post-content">
              {/* Caption */}
              {isEditingDescription ? (
                <div className="inline-editor">
                  <textarea
                    className="text-area"
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    maxLength={2200}
                  />
                  <div className="actions-row">
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => {
                        setDraftDescription(post.description ?? "");
                        setIsEditingDescription(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                    >
                      <Save size={14} />
                      {isSavingDescription ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : post.description ? (
                <div className="single-post-caption">
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
                  <div className="single-post-caption-text">
                    {post.user?.username ? (
                      <span className="post-description-user">
                        {post.user.username}
                      </span>
                    ) : null}
                    {post.description}
                  </div>
                </div>
              ) : null}

              {/* Comments */}
              {postId ? (
                <CommentSection
                  postId={postId}
                  onCountChange={(nextCount) =>
                    setPost((currentPost) =>
                      currentPost
                        ? { ...currentPost, commentCount: nextCount }
                        : currentPost,
                    )
                  }
                />
              ) : null}
            </div>

            <div className="single-post-footer">
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
                  {likeCount > 0 && (
                    <span className="action-count">{likeCount}</span>
                  )}
                </button>
              </div>
              <div className="single-post-date">
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Custom confirm dialog */}
      {confirmAction && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => setConfirmAction(null)}
          />
          <div className="confirm-dialog">
            <div className="confirm-dialog-body">
              <h3 className="confirm-dialog-title">{confirmAction.title}</h3>
              <p className="confirm-dialog-text">{confirmAction.text}</p>
            </div>
            <button
              type="button"
              className="confirm-dialog-action confirm-dialog-danger"
              onClick={confirmAction.onConfirm}
            >
              {confirmAction.dangerLabel}
            </button>
            <button
              type="button"
              className="confirm-dialog-action"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
