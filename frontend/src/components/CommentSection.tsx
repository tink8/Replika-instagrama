import { useEffect, useRef, useState } from "react";
import { Loader2, PencilLine, Trash2, X, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient, ApiError } from "../utils/apiClient";
import type { Comment, CommentListResponse } from "../types/api";

interface CommentSectionProps {
  postId: string;
  onCountChange?: (nextCount: number) => void;
}

export default function CommentSection({
  postId,
  onCountChange,
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await apiClient<CommentListResponse>(
          `/api/interactions/comments/${postId}`,
        );
        setComments(data.comments);
        onCountChangeRef.current?.(data.totalCount);
      } catch (error) {
        console.error("Failed to load comments", error);
        setError("Failed to load comments.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      const addedComment = await apiClient<{
        id: string;
        postId: string;
        userId: string;
        text: string;
        createdAt: string;
      }>(`/api/interactions/comments/${postId}`, {
        method: "POST",
        body: JSON.stringify({ text: newComment.trim() }),
      });

      setComments((prev) => [
        {
          ...addedComment,
          username: user?.username || "you",
          avatarUrl: user?.avatarUrl ?? null,
        },
        ...prev,
      ]);
      onCountChange?.(comments.length + 1);
      setNewComment("");
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        console.error("Failed to post comment", error);
        setError("Failed to post comment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
    setError("");
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim()) {
      setError("Comment text cannot be empty.");
      return;
    }

    setBusyCommentId(commentId);
    setError("");
    try {
      const updatedComment = await apiClient<{
        id: string;
        text: string;
      }>(`/api/interactions/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ text: editingText.trim() }),
      });

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, text: updatedComment.text }
            : comment,
        ),
      );
      cancelEditing();
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Failed to update comment.");
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleDeleteClick = (commentId: string) => {
    setDeleteTargetId(commentId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    const commentId = deleteTargetId;
    setDeleteTargetId(null);

    setBusyCommentId(commentId);
    setError("");
    try {
      await apiClient(`/api/interactions/comments/${commentId}`, {
        method: "DELETE",
      });

      const nextComments = comments.filter(
        (comment) => comment.id !== commentId,
      );
      setComments(nextComments);
      onCountChange?.(nextComments.length);
      if (editingCommentId === commentId) {
        cancelEditing();
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError("Failed to delete comment.");
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="state-card state-card-compact">
        <Loader2 className="spinner-icon" />
      </div>
    );
  }

  return (
    <section className="comments-card">
      {error ? (
        <div className="error-banner compact-banner">{error}</div>
      ) : null}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="empty-copy">No comments yet. Be the first one here.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-row">
              <div className="avatar avatar-small">
                {comment.avatarUrl ? (
                  <img
                    src={comment.avatarUrl}
                    alt={comment.username}
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-fallback">
                    {comment.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="comment-content">
                <div className="comment-copy">
                  <span className="comment-username">{comment.username}</span>
                  {editingCommentId === comment.id ? (
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="text-input text-input-inline"
                      maxLength={500}
                    />
                  ) : (
                    <span>{comment.text}</span>
                  )}
                </div>

                {user?.id === comment.userId ? (
                  <div className="comment-actions">
                    {editingCommentId === comment.id ? (
                      <>
                        <button
                          type="button"
                          className="comment-action"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={busyCommentId === comment.id}
                        >
                          <Check className="comment-action-icon" />
                          Save
                        </button>
                        <button
                          type="button"
                          className="comment-action"
                          onClick={cancelEditing}
                          disabled={busyCommentId === comment.id}
                        >
                          <X className="comment-action-icon" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="comment-action"
                          onClick={() => startEditing(comment)}
                          disabled={busyCommentId === comment.id}
                        >
                          <PencilLine className="comment-action-icon" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="comment-action comment-action-danger"
                          onClick={() => handleDeleteClick(comment.id)}
                          disabled={busyCommentId === comment.id}
                        >
                          <Trash2 className="comment-action-icon" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="comment-form">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="text-input text-input-ghost"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="button button-ghost"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </form>

      {/* Delete comment confirm dialog */}
      {deleteTargetId && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => setDeleteTargetId(null)}
          />
          <div className="confirm-dialog">
            <div className="confirm-dialog-body">
              <h3 className="confirm-dialog-title">Delete comment?</h3>
              <p className="confirm-dialog-text">
                This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="confirm-dialog-action confirm-dialog-danger"
              onClick={handleDeleteConfirm}
            >
              Delete
            </button>
            <button
              type="button"
              className="confirm-dialog-action"
              onClick={() => setDeleteTargetId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
