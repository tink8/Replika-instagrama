import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import type { Post } from "../types/api";
import PostCard from "../components/PostCard";
import CommentSection from "../components/CommentSection";

export default function SinglePost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await apiClient<Post>(`/api/posts/${postId}`);
        setPost(data);
      } catch (error) {
        console.error("Failed to load post", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) fetchPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!post) {
    return <div className="text-center text-red-500 mt-10">Post not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        <span className="text-sm font-semibold">Back</span>
      </button>

      <PostCard post={post} />

      {/* The Comment section attaches right below the PostCard */}
      {postId && <CommentSection postId={postId} />}
    </div>
  );
}
