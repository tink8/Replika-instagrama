import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search as SearchIcon,
  PlusSquare,
  User as UserIcon,
  LogOut,
  Heart,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiClient, ApiError } from "../utils/apiClient";
import type {
  SearchResponse,
  UserSummary,
  FollowRequest,
  FollowRequestsResponse,
} from "../types/api";
import UserCard from "./UserCard";
import OverlayPanel from "./OverlayPanel";

const RECENT_SEARCHES_KEY = "instagram_recent_searches";
const MAX_RECENT = 15;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((s) => s !== trimmed);
  existing.unshift(trimmed);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(existing.slice(0, MAX_RECENT)),
  );
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

const formatRelativeDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Logout confirm dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Search panel state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] =
    useState<string[]>(getRecentSearches());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Requests overlay state
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  // Requests polling state
  const [requestCount, setRequestCount] = useState(0);

  // Poll follow requests every 30 seconds
  useEffect(() => {
    const controller = new AbortController();
    const fetchRequests = async () => {
      try {
        const data = await apiClient<FollowRequestsResponse>(
          "/api/social/requests",
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setRequestCount(data.requests.length);
          setFollowRequests(data.requests);
        }
      } catch {
        // silently ignore (including AbortError)
      }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // Fetch requests when panel opens
  const handleOpenRequests = async () => {
    setRequestsPanelOpen(true);
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const data = await apiClient<FollowRequestsResponse>(
        "/api/social/requests",
      );
      setFollowRequests(data.requests);
      setRequestCount(data.requests.length);
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestsError(err.message);
      } else {
        setRequestsError("Failed to load requests.");
      }
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestDecision = async (
    requestId: string,
    decision: "accept" | "decline",
  ) => {
    setBusyRequestId(requestId);
    setRequestsError("");
    try {
      await apiClient(`/api/social/requests/${requestId}/${decision}`, {
        method: "PUT",
      });
      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
      setRequestCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestsError(err.message);
      } else {
        setRequestsError("Failed to update request.");
      }
    } finally {
      setBusyRequestId(null);
    }
  };

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiClient<SearchResponse>(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        setSearchResults(data.users);
      } catch {
        console.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus input when panel opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search panel on route change
  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        setRecentSearches(getRecentSearches());
      }
      return !prev;
    });
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleSearchResultClick = (username: string) => {
    saveRecentSearch(username);
    setRecentSearches(getRecentSearches());
  };

  const handleRecentClick = (term: string) => {
    setSearchQuery(term);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/create", icon: PlusSquare, label: "Create" },
    {
      path: user ? `/profile/${user.id}` : "/",
      icon: UserIcon,
      label: "Profile",
    },
  ];

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Primary">
        <Link to="/" className="brand">
          <span className="brand-mark">Instagram</span>
        </Link>

        <div className="nav-group">
          {/* Home */}
          {navItems.slice(0, 1).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === "/";
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`nav-link ${isActive ? "is-active" : ""}`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon
                  className="nav-link-icon"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="nav-link-label">{item.label}</span>
              </Link>
            );
          })}

          {/* Search toggle */}
          <button
            type="button"
            onClick={handleSearchToggle}
            className={`nav-link ${searchOpen ? "is-active" : ""}`}
            aria-label="Search"
            title="Search"
          >
            <SearchIcon
              className="nav-link-icon"
              strokeWidth={searchOpen ? 2.5 : 2}
            />
            <span className="nav-link-label">Search</span>
          </button>

          {/* Create, Profile */}
          {navItems.slice(1).map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`nav-link ${isActive ? "is-active" : ""}`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon
                  className="nav-link-icon"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="nav-link-label">{item.label}</span>
              </Link>
            );
          })}

          {/* Requests — opens overlay, not a page */}
          {user && (
            <button
              type="button"
              onClick={handleOpenRequests}
              className={`nav-link ${requestsPanelOpen ? "is-active" : ""}`}
              aria-label="Requests"
              title="Requests"
            >
              <Heart
                className="nav-link-icon"
                strokeWidth={requestsPanelOpen ? 2.5 : 2}
              />
              <span className="nav-link-label">Requests</span>
              {requestCount > 0 && (
                <span className="nav-badge">{requestCount}</span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleLogoutClick}
            className="nav-link nav-link-danger"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="nav-link-icon" />
            <span className="nav-link-label">Log out</span>
          </button>
        </div>
      </nav>

      {/* Search slide-out panel */}
      {searchOpen && (
        <>
          <div
            className="search-panel-backdrop"
            onClick={() => setSearchOpen(false)}
          />
          <aside className="search-panel">
            <div className="search-panel-header">
              <h2 className="search-panel-title">Search</h2>
              <button
                type="button"
                className="search-panel-close"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>

            <div className="search-panel-input-wrap">
              <SearchIcon className="search-panel-input-icon" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                className="search-panel-input"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-panel-input-clear"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="search-panel-body">
              {isSearching ? (
                <div className="search-panel-state">
                  <Loader2 className="spinner-icon" size={24} />
                </div>
              ) : searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <Link
                      key={u.id}
                      to={`/profile/${u.id}`}
                      onClick={() => handleSearchResultClick(u.username)}
                    >
                      <UserCard user={u} />
                    </Link>
                  ))
                ) : (
                  <div className="search-panel-state">No results found.</div>
                )
              ) : recentSearches.length > 0 ? (
                <>
                  <div className="search-panel-recent-header">
                    <span className="search-panel-recent-title">Recent</span>
                    <button
                      type="button"
                      className="button-ghost button-small"
                      onClick={handleClearRecent}
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="search-panel-recent-item"
                      onClick={() => handleRecentClick(term)}
                    >
                      <SearchIcon size={16} />
                      <span>{term}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="search-panel-state">
                  Try searching for people.
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      <main className="page-shell">
        <Outlet />
      </main>

      {/* Requests overlay panel */}
      <OverlayPanel
        open={requestsPanelOpen}
        title="Follow requests"
        subtitle="Approve or decline requests from people who want to follow you."
        onClose={() => setRequestsPanelOpen(false)}
      >
        {requestsError ? (
          <div className="error-banner compact-banner">{requestsError}</div>
        ) : null}

        {requestsLoading ? (
          <div className="state-card state-card-compact">
            <Loader2 className="spinner-icon" />
          </div>
        ) : followRequests.length === 0 ? (
          <p className="empty-copy">No pending requests right now.</p>
        ) : (
          <div className="social-list">
            {followRequests.map((request) => (
              <div key={request.id} className="social-row social-row-card">
                {request.from ? (
                  <Link
                    to={`/profile/${request.from.id}`}
                    className="social-row-main"
                    onClick={() => setRequestsPanelOpen(false)}
                  >
                    <div className="avatar avatar-medium">
                      {request.from.avatarUrl ? (
                        <img
                          src={request.from.avatarUrl}
                          alt={request.from.username}
                          className="avatar-image"
                        />
                      ) : (
                        <div className="avatar-fallback">
                          {request.from.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="social-row-copy">
                      <strong>{request.from.username}</strong>
                      <span>{request.from.name}</span>
                      <span className="helper-copy">
                        Requested {formatRelativeDate(request.createdAt)}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="social-row-main social-row-main-static">
                    <div className="social-row-copy">
                      <strong>Unknown user</strong>
                      <span>This request can no longer be resolved.</span>
                    </div>
                  </div>
                )}

                <div className="social-row-actions">
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => handleRequestDecision(request.id, "accept")}
                    disabled={busyRequestId === request.id}
                  >
                    {busyRequestId === request.id ? "..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => handleRequestDecision(request.id, "decline")}
                    disabled={busyRequestId === request.id}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </OverlayPanel>

      {/* Logout confirm dialog */}
      {showLogoutConfirm && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="confirm-dialog">
            <div className="confirm-dialog-body">
              <h3 className="confirm-dialog-title">Log out?</h3>
              <p className="confirm-dialog-text">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <button
              type="button"
              className="confirm-dialog-action confirm-dialog-danger"
              onClick={handleLogoutConfirm}
            >
              Log out
            </button>
            <button
              type="button"
              className="confirm-dialog-action"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
