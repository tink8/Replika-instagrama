import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";
import type { FeedResponse } from "../types/api";
import PostCard from "../components/PostCard";

export default function Feed() {
  const [feedData, setFeedData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeed = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const data = await apiClient<FeedResponse>(
        forceRefresh ? "/api/feed/refresh" : "/api/feed",
      );
      setFeedData(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load feed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        await loadFeed();
      } catch {
        // handled in loadFeed
      }
    };

    void fetchFeed();
  }, []);

  if (isLoading && !feedData) {
    return (
      <div
        className="feed-container"
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "40px",
        }}
      >
        <Loader2 className="spinner-icon" />
      </div>
    );
  }

  if (error && !feedData) {
    return (
      <div className="feed-container" style={{ paddingTop: "40px" }}>
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  if (!feedData || feedData.posts.length === 0) {
    return (
      <div className="feed-container">
        <section style={{ textAlign: "center", paddingTop: "60px" }}>
          <h1
            className="page-title"
            style={{ fontSize: "20px", marginBottom: "8px" }}
          >
            Welcome to Instagram
          </h1>
          <p className="page-copy">
            Once you follow people, their newest posts will appear here.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="feed-container">
      {error && <div className="error-banner">{error}</div>}
      <div className="feed-refresh-bar">
        <button
          type="button"
          className="feed-refresh-btn"
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
          aria-label="Refresh feed"
        >
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
      <div className="feed-stack">
        {feedData.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
