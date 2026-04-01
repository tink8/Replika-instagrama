export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
}

export interface UserSummary {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface PaginatedUserListResponse {
  page: number;
  totalPages: number;
  totalCount: number;
}

export interface FollowersResponse extends PaginatedUserListResponse {
  followers: UserSummary[];
}

export interface FollowingResponse extends PaginatedUserListResponse {
  following: UserSummary[];
}

export interface FollowRequest {
  id: string;
  from: UserSummary | null;
  createdAt: string;
}

export interface FollowRequestsResponse {
  requests: FollowRequest[];
}

export interface BlockedUsersResponse {
  blockedUsers: UserSummary[];
}

export interface SearchResponse {
  users: UserSummary[];
  page: number;
  totalPages: number;
}

export type FollowStatus =
  | "none"
  | "following"
  | "requested"
  | "blocked_by_you"
  | "blocked_by_them";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface Media {
  id: string;
  url: string;
  type: "image" | "video";
  order: number;
}

export interface PostUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  user?: PostUser;
  userId?: string;
  description: string | null;
  media: Media[];
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface FeedPost extends Post {
  user: PostUser;
}

export interface FeedResponse {
  posts: FeedPost[];
  page: number;
  totalPages: number;
}

export interface UserProfile extends CurrentUser {
  followerCount: number;
  followingCount: number;
  followStatus: FollowStatus;
  postCount: number;
  posts: Post[] | null;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: string;
}

export interface CommentListResponse {
  comments: Comment[];
  page: number;
  totalPages: number;
  totalCount: number;
}
