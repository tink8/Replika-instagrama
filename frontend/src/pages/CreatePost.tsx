import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";

export default function CreatePost() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image or video.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("media", file);
    formData.append("description", description);

    try {
      // The apiClient automatically removes Content-Type for FormData!
      await apiClient("/api/posts", {
        method: "POST",
        body: formData,
      });
      navigate("/"); // Go back to feed on success
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

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-300 rounded-sm overflow-hidden">
      <div className="border-b border-gray-300 p-4 text-center font-semibold text-gray-900">
        Create new post
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row">
        {/* Media Upload Area */}
        <div className="md:w-1/2 aspect-square bg-gray-50 border-r border-gray-300 flex flex-col items-center justify-center relative overflow-hidden">
          {previewUrl ? (
            file?.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="text-center p-6">
              <ImagePlus
                className="h-16 w-16 mx-auto text-gray-400 mb-4"
                strokeWidth={1}
              />
              <p className="text-xl font-light text-gray-700 mb-6">
                Drag photos and videos here
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition-colors"
              >
                Select from computer
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />
        </div>

        {/* Details Area */}
        <div className="md:w-1/2 flex flex-col">
          <div className="p-4 flex-grow">
            <textarea
              className="w-full h-32 resize-none border-none focus:ring-0 text-sm placeholder-gray-400"
              placeholder="Write a caption..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2200}
            />

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>

          <div className="p-4 border-t border-gray-300">
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 rounded-md text-sm transition-colors flex justify-center items-center"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Share"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
