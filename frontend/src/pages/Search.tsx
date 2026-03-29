import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import type { User } from "../types/api";
import UserCard from "../components/UserCard";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await apiClient<User[]>(
          `/api/users/search?q=${encodeURIComponent(query)}`,
        );
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce so we don't spam the API on every keystroke

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-300 rounded-sm min-h-[60vh]">
      <div className="p-4 border-b border-gray-300 relative">
        <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm transition-colors"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : results.length > 0 ? (
          results.map((user) => <UserCard key={user.id} user={user} />)
        ) : query.trim() ? (
          <div className="text-center p-8 text-gray-500 text-sm">
            No results found for "{query}"
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500 text-sm">
            Search for your friends, creators, and more.
          </div>
        )}
      </div>
    </div>
  );
}
