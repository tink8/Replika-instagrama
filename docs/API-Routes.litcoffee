# API Routes

---

## 1. API Gateway

The API Gateway is the single entry point for the frontend. It does not expose its own REST endpoints.

**Responsibilities:**

- Validates JWT on every request (except `/api/auth/register` and `/api/auth/login`) using the **public key** (RS256)
- Proxies requests to the correct downstream service
- Attaches `X-User-Id` header to forwarded requests

---

## 2. Auth Service

### Public Endpoints

| Method | Route                | Description                                                                      |
| ------ | -------------------- | -------------------------------------------------------------------------------- |
| POST   | `/api/auth/register` | Register a new user (creates credentials + calls User Service to create profile) |
| POST   | `/api/auth/login`    | Login with username/email + password → returns access + refresh tokens           |
| POST   | `/api/auth/logout`   | Logout — blacklists the refresh token                                            |
| POST   | `/api/auth/refresh`  | Issue new access token using a valid refresh token                               |

---

## 3. User Service

### Public Endpoints

| Method | Route                  | Description                                                            |
| ------ | ---------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/users/me`        | Get current user's own profile                                         |
| PATCH  | `/api/users/me`        | Update profile (name, username, bio, privacy setting) — partial update |
| PUT    | `/api/users/me/avatar` | Upload/update profile picture                                          |
| DELETE | `/api/users/me/avatar` | Remove profile picture                                                 |
| GET    | `/api/users/search?q=` | Search users by name or username                                       |
| GET    | `/api/users/:userId`   | View a user's profile (respects privacy/blocking via Social Service)   |

### Internal Endpoints

| Method | Route                                   | Called By                 | Description                                            |
| ------ | --------------------------------------- | ------------------------- | ------------------------------------------------------ |
| POST   | `/internal/users`                       | Auth Service              | Create a user profile record on registration           |
| GET    | `/internal/users/by-username/:username` | Auth Service              | Lookup user by username (for login)                    |
| GET    | `/internal/users/by-email/:email`       | Auth Service              | Lookup user by email (for login)                       |
| POST   | `/internal/users/batch`                 | Interaction, Feed Service | Get user details (name, avatar) for a list of user IDs |

---

## 4. Social Service

### Public Endpoints — Following

| Method | Route                               | Description                                             |
| ------ | ----------------------------------- | ------------------------------------------------------- |
| POST   | `/api/social/follow/:userId`        | Send follow request (auto-accepted for public profiles) |
| DELETE | `/api/social/follow/:userId`        | Unfollow a user                                         |
| DELETE | `/api/social/followers/:userId`     | Remove someone from your followers                      |
| GET    | `/api/social/followers/:userId`     | List a user's followers                                 |
| GET    | `/api/social/following/:userId`     | List who a user follows                                 |
| GET    | `/api/social/follow/status/:userId` | Get follow relationship status with a user              |
| GET    | `/api/social/counts/:userId`        | Get follower & following counts for a user              |

### Public Endpoints — Follow Requests

| Method | Route                                     | Description                           |
| ------ | ----------------------------------------- | ------------------------------------- |
| GET    | `/api/social/requests`                    | List pending incoming follow requests |
| PUT    | `/api/social/requests/:requestId/accept`  | Accept a follow request               |
| PUT    | `/api/social/requests/:requestId/decline` | Decline a follow request              |

### Public Endpoints — Blocking

| Method | Route                       | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/api/social/block/:userId` | Block a user (auto-unfollows both directions) |
| DELETE | `/api/social/block/:userId` | Unblock a user                                |
| GET    | `/api/social/blocks`        | List your blocked users                       |

### Internal Endpoints

| Method | Route                                         | Called By                        | Description                                  |
| ------ | --------------------------------------------- | -------------------------------- | -------------------------------------------- |
| GET    | `/internal/social/check-access/:targetUserId` | Post, Interaction, User services | Full access check (block + follow + privacy) |
| GET    | `/internal/social/following/:userId/list`     | Feed Service                     | Get raw list of followed user IDs            |

---

## 5. Post Service

### Public Endpoints

| Method | Route                               | Description                                                             |
| ------ | ----------------------------------- | ----------------------------------------------------------------------- |
| POST   | `/api/posts`                        | Create a post (multipart: up to 20 files, max 50MB each, + description) |
| GET    | `/api/posts/:postId`                | Get a single post with media                                            |
| PATCH  | `/api/posts/:postId`                | Update post description                                                 |
| DELETE | `/api/posts/:postId`                | Delete entire post                                                      |
| DELETE | `/api/posts/:postId/media/:mediaId` | Remove a single media item from a post                                  |
| GET    | `/api/posts/user/:userId`           | Get all posts by a user (gallery view, paginated)                       |

### Internal Endpoints

| Method | Route                            | Called By           | Description                                                     |
| ------ | -------------------------------- | ------------------- | --------------------------------------------------------------- |
| GET    | `/internal/posts/by-users`       | Feed Service        | Get posts by a list of user IDs (`?userIds=1,2,3&page=&limit=`) |
| GET    | `/internal/posts/:postId/exists` | Interaction Service | Check if a post exists and who owns it                          |

### Validation Rules

- Max 20 media items per post
- Max 50MB per media item
- Only image and video MIME types accepted
- Only the post owner can update/delete

---

## 6. Interaction Service

### Public Endpoints — Likes

| Method | Route                             | Description               |
| ------ | --------------------------------- | ------------------------- |
| POST   | `/api/interactions/likes/:postId` | Like a post               |
| DELETE | `/api/interactions/likes/:postId` | Unlike a post             |
| GET    | `/api/interactions/likes/:postId` | Get like count for a post |

### Public Endpoints — Comments

| Method | Route                                   | Description                         |
| ------ | --------------------------------------- | ----------------------------------- |
| POST   | `/api/interactions/comments/:postId`    | Add a comment                       |
| GET    | `/api/interactions/comments/:postId`    | Get comments for a post (paginated) |
| PUT    | `/api/interactions/comments/:commentId` | Edit your own comment               |
| DELETE | `/api/interactions/comments/:commentId` | Delete your own comment             |

### Internal Endpoints

| Method | Route                                   | Called By      | Description                                               |
| ------ | --------------------------------------- | -------------- | --------------------------------------------------------- |
| GET    | `/internal/interactions/counts/:postId` | Post Service   | Get like + comment counts for a single post               |
| GET    | `/internal/interactions/counts/batch`   | Feed Service   | Get counts for multiple posts (`?postIds=1,2,3`)          |
| DELETE | `/internal/interactions/purge`          | Social Service | Delete all likes/comments between two users after a block |

### Access Check Flow

Before allowing a like or comment, this service calls Social Service's `/internal/social/check-access/:postOwnerId` to verify the user has permission.

---

## 7. Feed Service

### Public Endpoints

| Method | Route               | Description                                                         |
| ------ | ------------------- | ------------------------------------------------------------------- |
| GET    | `/api/feed`         | Get current user's timeline (paginated, chronologically descending) |
| GET    | `/api/feed/refresh` | Force-refresh to load newest posts                                  |

### Internal Flow

No internal endpoints exposed. The Feed Service **consumes** other services' internal endpoints:

1. **Social Service** → `GET /internal/social/following/{userId}/list` — get list of followed user IDs
2. **Post Service** → `GET /internal/posts/by-users?userIds=...&page=&limit=` — get posts from those users
3. **Interaction Service** → `GET /internal/interactions/counts/batch?postIds=...` — enrich posts with like/comment counts

---

## Inter-Service Communication Summary

```
Auth ──────────► User Service        (create profile on register, lookup on login)
Post Service ──► Social Service      (access/privacy checks on view)
Interaction ───► Social Service      (access checks before like/comment)
Interaction ───► Post Service        (verify post exists + get owner)
Interaction ───► User Service        (batch lookup to enrich comments with names/avatars)
Feed ──────────► Social Service      (get following list)
Feed ──────────► Post Service        (get posts by user IDs)
Feed ──────────► Interaction Service (get like/comment counts)
Feed ──────────► User Service        (batch lookup to enrich post authors with names/avatars)
Social ────────► Interaction Service (purge interactions between users on block)
User Service ──► Social Service      (block check for search, counts for profile view)
```

All inter-service calls use `/internal/` prefixed endpoints that are **not exposed** through the API Gateway — only reachable within the Docker network.
