import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient, ApiError } from "../utils/apiClient";
import type { UserProfile } from "../types/api";

export default function EditProfile() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.username) return;
      try {
        const data = await apiClient<UserProfile>(
          `/api/users/${user.username}`,
        );
        setName(data.name || "");
        setBio(data.bio || "");
        setIsPrivate(data.isPrivate);
        setPreviewUrl(data.avatarUrl);
      } catch (err) {
        setError("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user?.username]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    formData.append("isPrivate", String(isPrivate));
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      await apiClient("/api/users/profile", {
        method: "PUT",
        body: formData,
      });
      await checkAuth(); // Refresh global user context
      navigate(`/profile/${user?.username}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-300 rounded-sm overflow-hidden">
      <div className="border-b border-gray-300 p-4 text-center font-semibold text-gray-900">
        Edit Profile
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-4 text-sm text-red-500 text-center">{error}</div>
        )}

        {/* Avatar Upload */}
        <div className="flex items-center space-x-4 mb-6">
          <div
            className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden border border-gray-300 relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-xl">
                {user?.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user?.username}</div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-500 font-semibold"
            >
              Change profile photo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              placeholder="Name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 resize-none h-24"
              placeholder="Write a bio..."
              maxLength={150}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900">
                Private Account
              </label>
              <p className="text-xs text-gray-500">
                When your account is private, only people you approve can see
                your photos and videos.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-6 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
