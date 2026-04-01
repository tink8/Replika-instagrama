import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Ban, Clock3, Grid, Loader2, Lock, Shield } from "lucide-react";
import { apiClient, ApiError } from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";
import OverlayPanel from "../components/OverlayPanel";
import type {
  BlockedUsersResponse,
  FollowersResponse,
  FollowingResponse,
  FollowRequest,
  FollowRequestsResponse,
  FollowStatus,
  UserProfile,
  UserSummary,
} from "../types/api";

type ActivePanel = "followers" | "following" | "requests" | "blocked" | null;

const followButtonLabel = (followStatus: FollowStatus) => {
  switch (followStatus) {
    case "following":
      return "Following";
    case "requested":
      return "Requested";
    case "blocked_by_you":
      return "Blocked";
    case "blocked_by_them":
      return "Unavailable";
    default:
      return "Follow";
  }
};

const formatRelativeDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);

  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserSummary[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const panelTitle = useMemo(() => {
    switch (activePanel) {
      case "followers":
        return "Followers";
      case "following":
        return "Following";
      case "requests":
        return "Follow requests";
      case "blocked":
        return "Blocked users";
      default:
        return "";
    }
  }, [activePanel]);

  const panelSubtitle = useMemo(() => {
    switch (activePanel) {
      case "followers":
        return "People who currently follow this profile.";
      case "following":
        return "Profiles this account follows right now.";
      case "requests":
        return "Approve or decline private follow requests.";
      case "blocked":
        return "People hidden from your profile and interactions.";
      default:
        return "";
    }
  }, [activePanel]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      if (!userId) {
        setError("User not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await apiClient<UserProfile>(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        setProfile(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void fetchProfile();
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!isOwnProfile) {
      setFollowRequests([]);
      setBlockedUsers([]);
      return;
    }

    const fetchOwnPanels = async () => {
      try {
        const [requestsResponse, blockedResponse] = await Promise.all([
          apiClient<FollowRequestsResponse>("/api/social/requests"),
          apiClient<BlockedUsersResponse>("/api/social/blocks"),
        ]);

        setFollowRequests(requestsResponse.requests);
        setBlockedUsers(blockedResponse.blockedUsers);
      } catch (loadError) {
        console.error("Failed to load own social data", loadError);
      }
    };

    void fetchOwnPanels();
  }, [isOwnProfile]);

  useEffect(() => {
    if (!activePanel || !profile) {
      return;
    }

    const fetchPanelData = async () => {
      setPanelLoading(true);
      setPanelError("");

      try {
        if (activePanel === "followers") {
          const response = await apiClient<FollowersResponse>(
            `/api/social/followers/${profile.id}?page=1&limit=100`,
          );
          setFollowers(response.followers);
        } else if (activePanel === "following") {
          const response = await apiClient<FollowingResponse>(
            `/api/social/following/${profile.id}?page=1&limit=100`,
          );
          setFollowing(response.following);
        } else if (activePanel === "requests" && isOwnProfile) {
          const response = await apiClient<FollowRequestsResponse>(
            "/api/social/requests",
          );
          setFollowRequests(response.requests);
        } else if (activePanel === "blocked" && isOwnProfile) {
          const response =
            await apiClient<BlockedUsersResponse>("/api/social/blocks");
          setBlockedUsers(response.blockedUsers);
        }
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setPanelError(loadError.message);
        } else {
          setPanelError("Failed to load this panel.");
        }
      } finally {
        setPanelLoading(false);
      }
    };

    void fetchPanelData();
  }, [activePanel, isOwnProfile, profile]);

  const closePanel = () => {
    setActivePanel(null);
    setPanelError("");
    setBusyRowId(null);
  };

  const handleFollowToggle = async () => {
    if (!profile || isFollowLoading) return;
    if (profile.followStatus === "blocked_by_you") return;
    if (profile.followStatus === "blocked_by_them") return;

    setIsFollowLoading(true);
    setError("");

    try {
      if (
        profile.followStatus === "following" ||
        profile.followStatus === "requested"
      ) {
        await apiClient(`/api/social/follow/${profile.id}`, {
          method: "DELETE",
        });

        setProfile((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                followStatus: "none",
                followerCount:
                  profile.followStatus === "following"
                    ? Math.max(0, currentProfile.followerCount - 1)
                    : currentProfile.followerCount,
              }
            : currentProfile,
        );
      } else {
        const response = await apiClient<{ status: FollowStatus }>(
          `/api/social/follow/${profile.id}`,
          {
            method: "POST",
          },
        );

        setProfile((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                followStatus: response.status,
                followerCount:
                  response.status === "following"
                    ? currentProfile.followerCount + 1
                    : currentProfile.followerCount,
              }
            : currentProfile,
        );
      }
    } catch (followError) {
      if (followError instanceof ApiError) {
        setError(followError.message);
      } else {
        setError("Failed to update follow state.");
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleBlockClick = () => {
    if (!profile || isOwnProfile || isBlockLoading) return;
    setShowBlockConfirm(true);
  };

  const handleBlockConfirm = async () => {
    if (!profile) return;
    setShowBlockConfirm(false);
    setIsBlockLoading(true);
    setError("");

    try {
      await apiClient(`/api/social/block/${profile.id}`, {
        method: "POST",
      });

      if (currentUser?.id) {
        navigate(`/profile/${currentUser.id}`);
      } else {
        navigate("/feed");
      }
    } catch (blockError) {
      if (blockError instanceof ApiError) {
        setError(blockError.message);
      } else {
        setError("Failed to block this user.");
      }
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleRequestDecision = async (
    requestId: string,
    decision: "accept" | "decline",
  ) => {
    setBusyRowId(requestId);
    setPanelError("");

    try {
      await apiClient(`/api/social/requests/${requestId}/${decision}`, {
        method: "PUT",
      });

      setFollowRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId),
      );

      if (decision === "accept") {
        setProfile((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                followerCount: currentProfile.followerCount + 1,
              }
            : currentProfile,
        );
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setPanelError(requestError.message);
      } else {
        setPanelError("Failed to update request.");
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleRemoveFollower = async (followerId: string) => {
    setBusyRowId(followerId);
    setPanelError("");

    try {
      await apiClient(`/api/social/followers/${followerId}`, {
        method: "DELETE",
      });

      setFollowers((currentFollowers) =>
        currentFollowers.filter((entry) => entry.id !== followerId),
      );
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              followerCount: Math.max(0, currentProfile.followerCount - 1),
            }
          : currentProfile,
      );
    } catch (removeError) {
      if (removeError instanceof ApiError) {
        setPanelError(removeError.message);
      } else {
        setPanelError("Failed to remove follower.");
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleUnfollowFromList = async (targetUserId: string) => {
    setBusyRowId(targetUserId);
    setPanelError("");

    try {
      await apiClient(`/api/social/follow/${targetUserId}`, {
        method: "DELETE",
      });

      setFollowing((currentFollowing) =>
        currentFollowing.filter((entry) => entry.id !== targetUserId),
      );
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              followingCount: Math.max(0, currentProfile.followingCount - 1),
            }
          : currentProfile,
      );
    } catch (removeError) {
      if (removeError instanceof ApiError) {
        setPanelError(removeError.message);
      } else {
        setPanelError("Failed to unfollow this user.");
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    setBusyRowId(targetUserId);
    setPanelError("");

    try {
      await apiClient(`/api/social/block/${targetUserId}`, {
        method: "DELETE",
      });

      setBlockedUsers((currentBlockedUsers) =>
        currentBlockedUsers.filter((entry) => entry.id !== targetUserId),
      );
    } catch (removeError) {
      if (removeError instanceof ApiError) {
        setPanelError(removeError.message);
      } else {
        setPanelError("Failed to unblock this user.");
      }
    } finally {
      setBusyRowId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="state-card">
        <Loader2 className="spinner-icon" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="error-banner page-banner">
        {error || "User not found"}
      </div>
    );
  }

  const rawPosts = profile.posts ?? [];
  const posts = [...new Map(rawPosts.map((p) => [p.id, p])).values()];

  const renderUserRow = (
    person: UserSummary,
    action?: {
      label: string;
      tone?: "danger" | "secondary";
      onClick: () => void;
    },
  ) => (
    <div key={person.id} className="social-row">
      <Link
        to={`/profile/${person.id}`}
        className="social-row-main"
        onClick={closePanel}
      >
        <div className="avatar avatar-medium">
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={person.username}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-fallback">
              {person.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="social-row-copy">
          <strong>{person.username}</strong>
          <span>{person.name}</span>
        </div>
      </Link>

      {action ? (
        <button
          type="button"
          className={`button ${action.tone === "danger" ? "button-danger" : "button-secondary"} button-small`}
          onClick={action.onClick}
          disabled={busyRowId === person.id}
        >
          {busyRowId === person.id ? "Saving..." : action.label}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="page-stack">
        {error ? <div className="error-banner page-banner">{error}</div> : null}

        <section className="profile-hero">
          <div className="profile-avatar-container">
            <div className="avatar avatar-xl">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-fallback avatar-fallback-xl">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="profile-copy">
            <div className="profile-heading">
              <h1 className="page-title page-title-small">
                {profile.username}
              </h1>
              {profile.isPrivate ? (
                <span className="status-chip">
                  <Lock className="status-chip-icon" />
                  Private
                </span>
              ) : null}
              {profile.followStatus === "requested" ? (
                <span className="status-chip">
                  <Clock3 className="status-chip-icon" size={14} />
                  Requested
                </span>
              ) : null}
              {profile.followStatus === "blocked_by_them" ? (
                <span className="status-chip">
                  <Ban className="status-chip-icon" size={14} />
                  Blocked
                </span>
              ) : null}
            </div>

            <div className="profile-stats">
              <div className="stat-pill">
                <strong>{profile.postCount ?? posts.length}</strong>
                <span>posts</span>
              </div>

              <button
                type="button"
                className="stat-pill stat-pill-button"
                onClick={() => setActivePanel("followers")}
              >
                <strong>{profile.followerCount}</strong>
                <span>followers</span>
              </button>

              <button
                type="button"
                className="stat-pill stat-pill-button"
                onClick={() => setActivePanel("following")}
              >
                <strong>{profile.followingCount}</strong>
                <span>following</span>
              </button>
            </div>

            <div className="profile-meta">
              <strong>{profile.name}</strong>
              {profile.bio ? (
                <p className="page-copy compact">{profile.bio}</p>
              ) : null}
            </div>

            {/* Action buttons below profile info */}
            {isOwnProfile ? (
              <div className="profile-actions-row profile-actions-below">
                <Link
                  to="/settings/profile"
                  className="button button-secondary profile-action-btn"
                >
                  Edit profile
                </Link>
                <button
                  type="button"
                  className="button button-secondary profile-action-btn"
                  onClick={() => setActivePanel("blocked")}
                >
                  <Shield size={16} />
                  Blocked
                  {blockedUsers.length ? ` (${blockedUsers.length})` : ""}
                </button>
              </div>
            ) : (
              <div className="profile-actions-row profile-actions-below">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={
                    isFollowLoading ||
                    profile.followStatus === "blocked_by_you" ||
                    profile.followStatus === "blocked_by_them"
                  }
                  className={`button profile-action-btn ${
                    profile.followStatus === "following" ||
                    profile.followStatus === "requested"
                      ? "button-secondary"
                      : "button-primary"
                  }`}
                >
                  {isFollowLoading
                    ? "Saving..."
                    : followButtonLabel(profile.followStatus)}
                </button>

                <button
                  type="button"
                  onClick={handleBlockClick}
                  disabled={
                    isBlockLoading || profile.followStatus === "blocked_by_you"
                  }
                  className="button button-danger profile-action-btn"
                >
                  <Ban size={16} />
                  {isBlockLoading ? "Blocking..." : "Block"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="profile-posts-section">
          <div className="section-heading-inline">
            <h2 className="section-title">
              <Grid size={12} />
              POSTS
            </h2>
          </div>

          {profile.posts === null ? (
            <div className="state-card state-card-compact">
              <Lock className="section-heading-icon" />
              <p className="empty-copy">
                This profile is private. Posts become visible once access is
                granted.
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-copy">No posts yet.</div>
          ) : (
            <div className="media-grid">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="media-tile"
                >
                  {post.media[0]?.type === "video" ? (
                    <video
                      src={post.media[0]?.url}
                      className="media-tile-content"
                    />
                  ) : (
                    <img
                      src={post.media[0]?.url}
                      alt="Post"
                      className="media-tile-content"
                    />
                  )}

                  {post.media.length > 1 ? (
                    <div className="media-badge">{post.media.length} items</div>
                  ) : null}

                  <div className="media-tile-overlay">
                    <span>{post.likeCount} likes</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <OverlayPanel
        open={activePanel !== null}
        title={panelTitle}
        subtitle={panelSubtitle}
        onClose={closePanel}
      >
        {panelError ? (
          <div className="error-banner compact-banner">{panelError}</div>
        ) : null}

        {panelLoading ? (
          <div className="state-card state-card-compact">
            <Loader2 className="spinner-icon" />
          </div>
        ) : null}

        {!panelLoading && activePanel === "followers" ? (
          <div className="social-list">
            {followers.length === 0 ? (
              <p className="empty-copy">No followers to show yet.</p>
            ) : (
              followers.map((person) =>
                renderUserRow(
                  person,
                  isOwnProfile
                    ? {
                        label: "Remove",
                        tone: "secondary",
                        onClick: () => handleRemoveFollower(person.id),
                      }
                    : undefined,
                ),
              )
            )}
          </div>
        ) : null}

        {!panelLoading && activePanel === "following" ? (
          <div className="social-list">
            {following.length === 0 ? (
              <p className="empty-copy">No followed profiles to show yet.</p>
            ) : (
              following.map((person) =>
                renderUserRow(
                  person,
                  isOwnProfile
                    ? {
                        label: "Unfollow",
                        tone: "secondary",
                        onClick: () => handleUnfollowFromList(person.id),
                      }
                    : undefined,
                ),
              )
            )}
          </div>
        ) : null}

        {!panelLoading && activePanel === "requests" ? (
          <div className="social-list">
            {followRequests.length === 0 ? (
              <p className="empty-copy">No pending requests right now.</p>
            ) : (
              followRequests.map((request) => (
                <div key={request.id} className="social-row social-row-card">
                  {request.from ? (
                    <Link
                      to={`/profile/${request.from.id}`}
                      className="social-row-main"
                      onClick={closePanel}
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
                      onClick={() =>
                        handleRequestDecision(request.id, "accept")
                      }
                      disabled={busyRowId === request.id}
                    >
                      {busyRowId === request.id ? "Saving..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() =>
                        handleRequestDecision(request.id, "decline")
                      }
                      disabled={busyRowId === request.id}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {!panelLoading && activePanel === "blocked" ? (
          <div className="social-list">
            {blockedUsers.length === 0 ? (
              <p className="empty-copy">You have not blocked anyone yet.</p>
            ) : (
              blockedUsers.map((person) =>
                renderUserRow(person, {
                  label: "Unblock",
                  tone: "danger",
                  onClick: () => handleUnblockUser(person.id),
                }),
              )
            )}
          </div>
        ) : null}
      </OverlayPanel>

      {/* Block confirm dialog */}
      {showBlockConfirm && profile && (
        <div className="confirm-overlay">
          <div
            className="confirm-backdrop"
            onClick={() => setShowBlockConfirm(false)}
          />
          <div className="confirm-dialog">
            <div className="confirm-dialog-body">
              <h3 className="confirm-dialog-title">
                Block @{profile.username}?
              </h3>
              <p className="confirm-dialog-text">
                They won't be able to find you, follow you, or interact with
                your posts.
              </p>
            </div>
            <button
              type="button"
              className="confirm-dialog-action confirm-dialog-danger"
              onClick={handleBlockConfirm}
            >
              Block
            </button>
            <button
              type="button"
              className="confirm-dialog-action"
              onClick={() => setShowBlockConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
