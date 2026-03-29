import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import type { Comment } from "../types/api";

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        // Assuming the API returns an array of comments
        const data = await apiClient<Comment[]>(
          `/api/posts/${postId}/comments`,
        );
        setComments(data);
      } catch (error) {
        console.error("Failed to load comments", error);
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
    try {
      const addedComment = await apiClient<Comment>(
        `/api/posts/${postId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: newComment.trim() }),
        },
      );

      // Add the new comment to the bottom of the list
      setComments((prev) => [...prev, addedComment]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-sm max-w-lg mx-auto mt-[-2rem] mb-8">
      <div className="p-4 max-h-64 overflow-y-auto border-b border-gray-200">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="mb-3 flex items-start">
              <span className="font-semibold text-sm text-gray-900 mr-2">
                {comment.user.username}
              </span>
              <span className="text-sm text-gray-800 break-words flex-1">
                {comment.content}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center p-3">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 border-none focus:ring-0 text-sm placeholder-gray-400"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="text-blue-500 font-semibold text-sm ml-2 disabled:opacity-50 transition-opacity"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
