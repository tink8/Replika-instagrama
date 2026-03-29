import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Grid, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";
import type { UserProfile } from "../types/api";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient<UserProfile>(`/api/users/${username}`);
        setProfile(data);
        setIsFollowing(data.isFollowing);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (username) fetchProfile();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!profile || isFollowLoading) return;
    setIsFollowLoading(true);

    const previousState = isFollowing;
    setIsFollowing(!previousState); // Optimistic update

    try {
      if (previousState) {
        await apiClient(`/api/interactions/follows/${profile.id}`, {
          method: "DELETE",
        });
      } else {
        await apiClient(`/api/interactions/follows/${profile.id}`, {
          method: "POST",
        });
      }
    } catch (error) {
      setIsFollowing(previousState); // Revert on error
      console.error("Failed to toggle follow", error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center text-red-500 mt-10">
        {error || "User not found"}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start mb-10 pb-10 border-b border-gray-300 px-4">
        <div className="md:w-1/3 flex justify-center mb-6 md:mb-0">
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-4xl">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="md:w-2/3 flex flex-col items-center md:items-start">
          <div className="flex flex-col sm:flex-row items-center mb-4 space-y-3 sm:space-y-0 sm:space-x-4">
            <h1 className="text-xl text-gray-900 font-light">
              {profile.username}
            </h1>

            {!isOwnProfile ? (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`px-6 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  isFollowing
                    ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : (
              <Link
                to="/settings/profile"
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md text-sm font-semibold transition-colors block"
              >
                Edit Profile
              </Link>
            )}
          </div>

          <div className="flex space-x-6 mb-4 text-sm">
            <div>
              <span className="font-semibold text-gray-900">
                {profile.postCount}
              </span>{" "}
              posts
            </div>
            <div className="cursor-pointer">
              <span className="font-semibold text-gray-900">
                {profile.followersCount}
              </span>{" "}
              followers
            </div>
            <div className="cursor-pointer">
              <span className="font-semibold text-gray-900">
                {profile.followingCount}
              </span>{" "}
              following
            </div>
          </div>

          <div className="text-sm text-center md:text-left">
            <div className="font-semibold text-gray-900">{profile.name}</div>
            {profile.bio && (
              <div className="whitespace-pre-wrap mt-1 text-gray-900">
                {profile.bio}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts Grid Header */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center space-x-2 border-t border-gray-900 pt-4 -mt-[1px]">
          <Grid className="h-4 w-4 text-gray-900" />
          <span className="text-xs font-semibold text-gray-900 tracking-widest uppercase">
            Posts
          </span>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-6">
        {profile.posts.map((post) => (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="aspect-square bg-gray-100 relative group cursor-pointer overflow-hidden block"
          >
            {post.media[0]?.type === "video" ? (
              <video
                src={post.media[0]?.url}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={post.media[0]?.url}
                alt="Post"
                className="w-full h-full object-cover"
              />
            )}
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-6 text-white font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">❤️</span>
                  <span>{post.likeCount}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💬</span>
                  <span>{post.commentCount}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {profile.posts.length === 0 && (
        <div className="text-center text-gray-500 py-10 text-sm">
          No posts yet.
        </div>
      )}
    </div>
  );
}
