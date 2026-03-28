export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface User {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
}

export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  posts: Post[];
}

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
  createdAt: string;
}

export interface FeedResponse {
  posts: Post[];
  page: number;
  totalPages: number;
}

export interface Comment {
  id: string;
  user: PostUser;
  content: string;
  createdAt: string;
}
