import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";

export default function CreatePost() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDiscard, setShowDiscard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const previewUrls = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewUrls]);

  // Clamp active index whenever files list shrinks
  useEffect(() => {
    if (files.length > 0 && activeIndex >= files.length) {
      setActiveIndex(files.length - 1);
    }
  }, [files.length, activeIndex]);

  const hasContent = files.length > 0 || description.trim().length > 0;

  const handleClose = () => {
    if (hasContent) {
      setShowDiscard(true);
    } else {
      navigate(-1);
    }
  };

  const handleDiscard = () => {
    setShowDiscard(false);
    navigate(-1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const overSizeFile = selectedFiles.find((f) => f.size > 50 * 1024 * 1024);
    if (overSizeFile) {
      setError(`File "${overSizeFile.name}" exceeds the 50MB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFiles.length) {
      setFiles((prev) => {
        if (prev.length + selectedFiles.length > 20) {
          setError(
            `You can only select up to 20 media items total. You tried to add ${selectedFiles.length} files to your existing ${prev.length}.`,
          );
          return prev;
        }
        setError("");
        return [...prev, ...selectedFiles];
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveCurrent = () => {
    const removedIndex = activeIndex;
    setFiles((prev) => prev.filter((_, idx) => idx !== removedIndex));
    setActiveIndex((prev) => {
      const nextLength = files.length - 1;
      return prev >= nextLength ? Math.max(nextLength - 1, 0) : prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      setError("Please select at least one image or video.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    files.forEach((file) => formData.append("media", file));
    formData.append("description", description);

    try {
      await apiClient("/api/posts", {
        method: "POST",
        body: formData,
      });
      navigate(user?.id ? `/profile/${user.id}` : "/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create post. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentItem = previewUrls[activeIndex] ?? previewUrls[0];
  const hasMultiple = previewUrls.length > 1;
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === previewUrls.length - 1;

  return (
    <>
      {/* Modal overlay */}
      <div className="create-overlay">
        <div className="create-backdrop" onClick={handleClose} />

        <div className="create-modal">
          <header className="create-modal-header">
            <button
              type="button"
              className="create-modal-back"
              onClick={handleClose}
              aria-label="Close"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="create-modal-title">Create new post</h1>
            <button
              type="submit"
              form="create-form"
              className="button-ghost"
              disabled={!files.length || isSubmitting}
            >
              {isSubmitting ? "Sharing..." : "Share"}
            </button>
          </header>

          <form
            id="create-form"
            onSubmit={handleSubmit}
            className="create-modal-body"
          >
            <div className="create-modal-preview">
              {currentItem ? (
                <div className="composer-main-media">
                  {currentItem.file.type.startsWith("video/") ? (
                    <video
                      key={currentItem.url}
                      src={currentItem.url}
                      controls
                      className="composer-main-media-content"
                    />
                  ) : (
                    <img
                      key={currentItem.url}
                      src={currentItem.url}
                      alt={`Preview ${activeIndex + 1}`}
                      className="composer-main-media-content"
                    />
                  )}

                  <button
                    type="button"
                    className="carousel-remove"
                    onClick={handleRemoveCurrent}
                    aria-label="Remove this file"
                  >
                    <X size={14} />
                  </button>

                  {hasMultiple && (
                    <>
                      {!isFirst && (
                        <button
                          type="button"
                          className="carousel-nav carousel-nav-left"
                          onClick={() => setActiveIndex((i) => i - 1)}
                          aria-label="Previous"
                        >
                          <ChevronLeft />
                        </button>
                      )}

                      {!isLast && (
                        <button
                          type="button"
                          className="carousel-nav carousel-nav-right"
                          onClick={() => setActiveIndex((i) => i + 1)}
                          aria-label="Next"
                        >
                          <ChevronRight />
                        </button>
                      )}

                      <div className="carousel-counter">
                        {activeIndex + 1} / {previewUrls.length}
                      </div>

                      <div className="carousel-dots">
                        {previewUrls.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`carousel-dot ${idx === activeIndex ? "is-active" : ""}`}
                            onClick={() => setActiveIndex(idx)}
                            aria-label={`Go to file ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Add more media button */}
                  <button
                    type="button"
                    className="create-add-more"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Add more media"
                  >
                    <ImagePlus size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="composer-empty"
                >
                  <ImagePlus size={48} strokeWidth={1.5} />
                  <span className="composer-empty-label">
                    Drag photos and videos here
                  </span>
                  <span
                    className="button button-primary button-small"
                    style={{ marginTop: 8 }}
                  >
                    Select from computer
                  </span>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden-input"
                multiple
              />
            </div>

            <div className="create-modal-sidebar">
              {/* Avatar + username */}
              <div className="create-user-row">
                <div className="avatar avatar-small">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-fallback">
                      {(user?.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="create-user-name">{user?.username}</span>
              </div>

              <textarea
                className="create-caption-input"
                placeholder="Write a caption..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2200}
              />

              <div className="create-caption-count">
                {description.length}/2,200
              </div>

              {error && (
                <div className="error-banner compact-banner">{error}</div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Custom discard confirm dialog */}
      {showDiscard && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => setShowDiscard(false)}
          />
          <div className="confirm-dialog">
            <div className="confirm-dialog-body">
              <h3 className="confirm-dialog-title">Discard post?</h3>
              <p className="confirm-dialog-text">
                If you leave, your edits won't be saved.
              </p>
            </div>
            <button
              type="button"
              className="confirm-dialog-action confirm-dialog-danger"
              onClick={handleDiscard}
            >
              Discard
            </button>
            <button
              type="button"
              className="confirm-dialog-action"
              onClick={() => setShowDiscard(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
