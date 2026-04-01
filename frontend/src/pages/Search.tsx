import { useEffect, useState } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import type { SearchResponse, UserSummary } from "../types/api";
import UserCard from "../components/UserCard";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await apiClient<SearchResponse>(
          `/api/users/search?q=${encodeURIComponent(query)}`,
        );
        setResults(data.users);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="feed-container">
      <section
        className="page-card"
        style={{
          border: "none",
          background: "transparent",
          boxShadow: "none",
          padding: "0 20px",
        }}
      >
        <header
          className="page-card-header"
          style={{
            borderBottom: "none",
            flexDirection: "column",
            alignItems: "flex-start",
            paddingBottom: "20px",
          }}
        >
          <h1
            className="page-title"
            style={{
              marginBottom: "24px",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            Search
          </h1>

          <div
            className="search-bar"
            style={{ width: "100%", maxWidth: "none" }}
          >
            <SearchIcon
              className="search-bar-icon"
              size={16}
              style={{ color: "#8e8e8e", left: "12px" }}
            />
            <input
              type="text"
              className="search-input"
              style={{
                background: "#efefef",
                border: "none",
                borderRadius: "8px",
                paddingLeft: "40px",
                paddingRight: "16px",
                height: "40px",
                fontSize: "16px",
              }}
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="results-list">
          {isLoading ? (
            <div
              className="state-card state-card-compact"
              style={{
                minHeight: "80px",
                border: "none",
                background: "transparent",
              }}
            >
              <Loader2 className="spinner-icon" />
            </div>
          ) : results.length > 0 ? (
            results.map((user) => <UserCard key={user.id} user={user} />)
          ) : query.trim() ? (
            <div className="empty-copy">No results found.</div>
          ) : (
            <div className="empty-copy">Recent searches will appear here.</div>
          )}
        </div>
      </section>
    </div>
  );
}
