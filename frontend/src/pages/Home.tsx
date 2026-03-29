import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";

interface Post {
  id: string;
  userId: string;
  username: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const data = await api.getFeed();
        setPosts(data);
      } catch (err: any) {
        setError(err.message || "Failed to load feed");
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  if (loading) return <div className="text-center mt-20">Loading feed...</div>;
  if (error)
    return <div className="text-center mt-20 text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto pt-20 pb-10 px-4">
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          No posts yet. Follow some users!
        </div>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="bg-white border border-gray-200 rounded-lg mb-6"
          >
            {/* Post Header */}
            <div className="flex items-center p-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
              <span className="font-semibold text-sm">{post.username}</span>
            </div>

            {/* Post Image */}
            <div className="w-full aspect-square bg-gray-100">
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Post Actions */}
            <div className="p-3">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-4">
                  <Heart className="w-6 h-6 hover:text-gray-500 cursor-pointer" />
                  <MessageCircle className="w-6 h-6 hover:text-gray-500 cursor-pointer" />
                  <Send className="w-6 h-6 hover:text-gray-500 cursor-pointer" />
                </div>
                <Bookmark className="w-6 h-6 hover:text-gray-500 cursor-pointer" />
              </div>

              <div className="font-semibold text-sm mb-1">
                {post.likesCount} likes
              </div>

              {/* Caption */}
              <div className="text-sm">
                <span className="font-semibold mr-2">{post.username}</span>
                {post.caption}
              </div>

              <div className="text-gray-500 text-xs mt-2 uppercase">
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
