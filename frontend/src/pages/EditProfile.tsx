import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient, ApiError } from "../utils/apiClient";
import type { CurrentUser } from "../types/api";

export default function EditProfile() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiClient<CurrentUser>("/api/users/me");
        setName(data.name || "");
        setUsername(data.username || "");
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
  }, []);

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

    try {
      await apiClient<CurrentUser>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          username,
          bio,
          isPrivate,
        }),
      });

      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append("avatar", avatarFile);

        await apiClient<{ avatarUrl: string }>("/api/users/me/avatar", {
          method: "PUT",
          body: avatarFormData,
        });
      }

      await checkAuth();
      navigate(`/profile/${user?.id}`);
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
      <div className="state-card">
        <Loader2 className="spinner-icon" />
      </div>
    );
  }

  return (
    <section className="page-card profile-form-card">
      <header className="page-card-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="section-title">Edit profile</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="form-stack">
        {error && <div className="error-banner compact-banner">{error}</div>}

        <div className="avatar-editor">
          <button
            type="button"
            className="avatar avatar-large avatar-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Avatar" className="avatar-image" />
            ) : (
              <div className="avatar-fallback">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <span className="avatar-overlay">
              <Camera className="section-heading-icon" />
            </span>
          </button>

          <div className="avatar-editor-copy">
            <strong>@{user?.username}</strong>
            <span className="helper-copy">
              Upload a new image if you want to refresh your avatar.
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-link-button"
            >
              Change profile photo
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden-input"
          />
        </div>

        <label className="field">
          <span className="field-label">Name</span>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-input"
            placeholder="Name"
          />
        </label>

        <label className="field">
          <span className="field-label">Username</span>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="text-input"
            placeholder="Username"
          />
        </label>

        <label className="field">
          <span className="field-label">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="text-area"
            placeholder="Write a short bio..."
            maxLength={150}
          />
        </label>

        <div className="settings-row">
          <div>
            <div className="field-label">Private Account</div>
            <p className="helper-copy">
              Only approved followers can see your posts when privacy is
              enabled.
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span className="switch-track" />
          </label>
        </div>

        <div className="actions-row">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate(`/profile/${user?.id}`)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button button-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="button-icon-spin"
                  style={{ width: 16, height: 16 }}
                />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
