# API Errors & Service Contracts

---

## 1. Standard Error Response Format

All services return errors in a consistent JSON format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error."
  }
}
```

---

## 2. Common HTTP Status Codes

These apply across **all** services:

| Status Code | Meaning                | When Used                                         |
| ----------- | ---------------------- | ------------------------------------------------- |
| 200         | OK                     | Successful GET, PATCH, PUT                        |
| 201         | Created                | Successful POST that creates a resource           |
| 204         | No Content             | Successful DELETE                                 |
| 400         | Bad Request            | Missing/invalid fields, validation errors         |
| 401         | Unauthorized           | Missing or invalid JWT token                      |
| 403         | Forbidden              | User does not have permission for this action     |
| 404         | Not Found              | Resource does not exist                           |
| 409         | Conflict               | Duplicate resource (e.g., username already taken) |
| 413         | Payload Too Large      | File exceeds size limit                           |
| 415         | Unsupported Media Type | File type not allowed                             |
| 422         | Unprocessable Entity   | Request is well-formed but semantically invalid   |
| 429         | Too Many Requests      | Rate limit exceeded (optional)                    |
| 500         | Internal Server Error  | Unexpected server error                           |

---

## 3. API Gateway Errors

The gateway handles JWT validation before proxying. If validation fails, the request never reaches the downstream service.

| Scenario                       | Status | Error Code            | Message                                           |
| ------------------------------ | ------ | --------------------- | ------------------------------------------------- |
| No Authorization header        | 401    | `TOKEN_MISSING`       | "Authorization token is required."                |
| Malformed token                | 401    | `TOKEN_MALFORMED`     | "Authorization token is malformed."               |
| Token signature invalid        | 401    | `TOKEN_INVALID`       | "Authorization token is invalid."                 |
| Token expired                  | 401    | `TOKEN_EXPIRED`       | "Authorization token has expired."                |
| Downstream service unreachable | 502    | `SERVICE_UNAVAILABLE` | "The requested service is currently unavailable." |
| Downstream service timeout     | 504    | `SERVICE_TIMEOUT`     | "The requested service did not respond in time."  |

---

## 4. Auth Service

### POST `/api/auth/register`

**Expected Request Body:**

```json
{
  "name": "string (required)",
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response:** `201 Created`

```json
{
  "message": "User registered successfully.",
  "userId": "string"
}
```

**Error Responses:**

| Scenario                 | Status | Error Code            | Message                                                    |
| ------------------------ | ------ | --------------------- | ---------------------------------------------------------- |
| Missing required fields  | 400    | `MISSING_FIELDS`      | "Fields name, username, email, and password are required." |
| Invalid email format     | 400    | `INVALID_EMAIL`       | "Email address is not valid."                              |
| Password too weak        | 400    | `WEAK_PASSWORD`       | "Password must be at least 8 characters."                  |
| Username already taken   | 409    | `USERNAME_TAKEN`      | "This username is already in use."                         |
| Email already registered | 409    | `EMAIL_TAKEN`         | "This email is already registered."                        |
| User Service unreachable | 502    | `SERVICE_UNAVAILABLE` | "Unable to create user profile. Please try again."         |

---

### POST `/api/auth/login`

**Expected Request Body:**

```json
{
  "login": "string (required — username or email)",
  "password": "string (required)"
}
```

**Success Response:** `200 OK`

```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Error Responses:**

| Scenario                | Status | Error Code            | Message                                   |
| ----------------------- | ------ | --------------------- | ----------------------------------------- |
| Missing required fields | 400    | `MISSING_FIELDS`      | "Fields login and password are required." |
| User not found          | 401    | `INVALID_CREDENTIALS` | "Invalid username/email or password."     |
| Wrong password          | 401    | `INVALID_CREDENTIALS` | "Invalid username/email or password."     |

> **Note:** Both "user not found" and "wrong password" return the same error to prevent user enumeration attacks.

---

### POST `/api/auth/logout`

**Expected Request Body:**

```json
{
  "refreshToken": "string (required)"
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Logged out successfully."
}
```

**Error Responses:**

| Scenario              | Status | Error Code       | Message                      |
| --------------------- | ------ | ---------------- | ---------------------------- |
| Missing refresh token | 400    | `MISSING_FIELDS` | "Refresh token is required." |
| Invalid refresh token | 401    | `INVALID_TOKEN`  | "Refresh token is invalid."  |

---

### POST `/api/auth/refresh`

**Expected Request Body:**

```json
{
  "refreshToken": "string (required)"
}
```

**Success Response:** `200 OK`

```json
{
  "accessToken": "string"
}
```

**Error Responses:**

| Scenario                      | Status | Error Code       | Message                                |
| ----------------------------- | ------ | ---------------- | -------------------------------------- |
| Missing refresh token         | 400    | `MISSING_FIELDS` | "Refresh token is required."           |
| Invalid/expired refresh token | 401    | `INVALID_TOKEN`  | "Refresh token is invalid or expired." |
| Blacklisted refresh token     | 401    | `TOKEN_REVOKED`  | "This refresh token has been revoked." |

---

## 5. User Service

### GET `/api/users/me`

**Success Response:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "bio": "string | null",
  "avatarUrl": "string | null",
  "isPrivate": "boolean"
}
```

**Error Responses:**

| Scenario                            | Status | Error Code       | Message                   |
| ----------------------------------- | ------ | ---------------- | ------------------------- |
| User not found (data inconsistency) | 404    | `USER_NOT_FOUND` | "User profile not found." |

---

### PATCH `/api/users/me`

**Expected Request Body (all fields optional):**

```json
{
  "name": "string",
  "username": "string",
  "bio": "string",
  "isPrivate": "boolean"
}
```

**Success Response:** `200 OK` — returns updated profile (same format as GET `/api/users/me`)

**Error Responses:**

| Scenario               | Status | Error Code       | Message                                           |
| ---------------------- | ------ | ---------------- | ------------------------------------------------- |
| No fields provided     | 400    | `NO_FIELDS`      | "At least one field must be provided for update." |
| Username already taken | 409    | `USERNAME_TAKEN` | "This username is already in use."                |
| Invalid field values   | 400    | `INVALID_FIELDS` | "One or more field values are invalid."           |

---

### PUT `/api/users/me/avatar`

**Expected Request:** `multipart/form-data` with a single image file field `avatar`

**Success Response:** `200 OK`

```json
{
  "avatarUrl": "string"
}
```

**Error Responses:**

| Scenario          | Status | Error Code          | Message                           |
| ----------------- | ------ | ------------------- | --------------------------------- |
| No file uploaded  | 400    | `NO_FILE`           | "An image file is required."      |
| File too large    | 413    | `FILE_TOO_LARGE`    | "File size must not exceed 50MB." |
| Invalid file type | 415    | `INVALID_FILE_TYPE` | "Only image files are allowed."   |

---

### DELETE `/api/users/me/avatar`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario            | Status | Error Code         | Message                         |
| ------------------- | ------ | ------------------ | ------------------------------- |
| No avatar to delete | 404    | `AVATAR_NOT_FOUND` | "No profile picture to remove." |

---

### GET `/api/users/search?q=`

**Query Parameters:**

- `q` (required) — search term (name or username)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Success Response:** `200 OK`

```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "username": "string",
      "avatarUrl": "string | null"
    }
  ],
  "page": 1,
  "totalPages": 5
}
```

> **Note:** Blocked users are filtered out. This service calls Social Service `/internal/social/check-access` to exclude blocked profiles from results.

**Error Responses:**

| Scenario             | Status | Error Code      | Message                                   |
| -------------------- | ------ | --------------- | ----------------------------------------- |
| Missing search query | 400    | `MISSING_QUERY` | "Search query parameter 'q' is required." |

---

### GET `/api/users/:userId`

**Success Response:** `200 OK`

For all profiles (regardless of privacy):

```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "bio": "string | null",
  "avatarUrl": "string | null",
  "isPrivate": "boolean",
  "followerCount": 0,
  "followingCount": 0,
  "followStatus": "none | following | requested",
  "posts": null
}
```

If the profile is public OR the current user follows them, `posts` is populated:

```json
{
  "posts": [
    {
      "id": "string",
      "media": [...],
      "description": "string",
      "likeCount": 0,
      "commentCount": 0,
      "createdAt": "ISO 8601"
    }
  ]
}
```

**Error Responses:**

| Scenario        | Status | Error Code       | Message           |
| --------------- | ------ | ---------------- | ----------------- |
| User not found  | 404    | `USER_NOT_FOUND` | "User not found." |
| User is blocked | 404    | `USER_NOT_FOUND` | "User not found." |

> **Note:** Blocked users return 404, not 403, to prevent revealing that the profile exists.

---

### Internal: POST `/internal/users`

**Expected Request Body:**

```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "email": "string"
}
```

**Success Response:** `201 Created`

**Error Responses:**

| Scenario                | Status | Error Code       | Message                                              |
| ----------------------- | ------ | ---------------- | ---------------------------------------------------- |
| Missing required fields | 400    | `MISSING_FIELDS` | "Fields id, name, username, and email are required." |
| Duplicate username      | 409    | `USERNAME_TAKEN` | "This username is already in use."                   |
| Duplicate email         | 409    | `EMAIL_TAKEN`    | "This email is already registered."                  |

---

### Internal: GET `/internal/users/by-username/:username`

**Success Response:** `200 OK`

```json
{
  "id": "string",
  "email": "string",
  "username": "string"
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| User not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

### Internal: GET `/internal/users/by-email/:email`

**Success Response:** `200 OK` — same format as above

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| User not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

### Internal: POST `/internal/users/batch`

**Expected Request Body:**

```json
{
  "userIds": ["id1", "id2"]
}
```

**Success Response:** `200 OK`

```json
{
  "users": [
    {
      "id": "id1",
      "name": "John Doe",
      "username": "johndoe",
      "avatarUrl": "http://minio..."
    },
    {
      "id": "id2",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatarUrl": null
    }
  ]
}
```

**Error Responses:**

| Scenario              | Status | Error Code       | Message                                           |
| --------------------- | ------ | ---------------- | ------------------------------------------------- |
| Missing userIds array | 400    | `MISSING_FIELDS` | "Field userIds is required and must be an array." |

---

## 6. Social Service

### POST `/api/social/follow/:userId`

**Success Response:** `201 Created`

```json
{
  "status": "following | requested",
  "message": "Now following this user." | "Follow request sent."
}
```

**Error Responses:**

| Scenario                    | Status | Error Code          | Message                                      |
| --------------------------- | ------ | ------------------- | -------------------------------------------- |
| Target user not found       | 404    | `USER_NOT_FOUND`    | "User not found."                            |
| Already following           | 409    | `ALREADY_FOLLOWING` | "You are already following this user."       |
| Pending request exists      | 409    | `REQUEST_PENDING`   | "A follow request is already pending."       |
| Cannot follow yourself      | 400    | `SELF_FOLLOW`       | "You cannot follow yourself."                |
| Blocked by target user      | 403    | `BLOCKED`           | "You cannot follow this user."               |
| You blocked the target user | 403    | `BLOCKED`           | "You cannot follow a user you have blocked." |

---

### DELETE `/api/social/follow/:userId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario                | Status | Error Code      | Message                            |
| ----------------------- | ------ | --------------- | ---------------------------------- |
| Not following this user | 404    | `NOT_FOLLOWING` | "You are not following this user." |

---

### DELETE `/api/social/followers/:userId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario                  | Status | Error Code       | Message                           |
| ------------------------- | ------ | ---------------- | --------------------------------- |
| User is not your follower | 404    | `NOT_A_FOLLOWER` | "This user is not your follower." |

---

### GET `/api/social/followers/:userId`

**Success Response:** `200 OK`

```json
{
  "followers": [
    {
      "id": "string",
      "name": "string",
      "username": "string",
      "avatarUrl": "string | null"
    }
  ],
  "page": 1,
  "totalPages": 5,
  "totalCount": 100
}
```

**Error Responses:**

| Scenario                        | Status | Error Code       | Message                    |
| ------------------------------- | ------ | ---------------- | -------------------------- |
| User not found                  | 404    | `USER_NOT_FOUND` | "User not found."          |
| Private profile & not following | 403    | `ACCESS_DENIED`  | "This profile is private." |

---

### GET `/api/social/following/:userId`

**Success Response:** `200 OK` — same format as followers

**Error Responses:** Same as GET `/api/social/followers/:userId`

---

### GET `/api/social/follow/status/:userId`

**Success Response:** `200 OK`

```json
{
  "status": "none | following | requested | blocked_by_you | blocked_by_them"
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| User not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

### GET `/api/social/counts/:userId`

**Success Response:** `200 OK`

```json
{
  "followerCount": 0,
  "followingCount": 0
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| User not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

### GET `/api/social/requests`

**Success Response:** `200 OK`

```json
{
  "requests": [
    {
      "id": "string",
      "from": {
        "id": "string",
        "name": "string",
        "username": "string",
        "avatarUrl": "string | null"
      },
      "createdAt": "ISO 8601"
    }
  ]
}
```

---

### PUT `/api/social/requests/:requestId/accept`

**Success Response:** `200 OK`

```json
{
  "message": "Follow request accepted."
}
```

**Error Responses:**

| Scenario                     | Status | Error Code          | Message                           |
| ---------------------------- | ------ | ------------------- | --------------------------------- |
| Request not found            | 404    | `REQUEST_NOT_FOUND` | "Follow request not found."       |
| Request not addressed to you | 403    | `ACCESS_DENIED`     | "You cannot manage this request." |

---

### PUT `/api/social/requests/:requestId/decline`

**Success Response:** `200 OK`

```json
{
  "message": "Follow request declined."
}
```

**Error Responses:** Same as accept

---

### POST `/api/social/block/:userId`

**Success Response:** `201 Created`

```json
{
  "message": "User blocked."
}
```

**Error Responses:**

| Scenario              | Status | Error Code        | Message                               |
| --------------------- | ------ | ----------------- | ------------------------------------- |
| User not found        | 404    | `USER_NOT_FOUND`  | "User not found."                     |
| Already blocked       | 409    | `ALREADY_BLOCKED` | "You have already blocked this user." |
| Cannot block yourself | 400    | `SELF_BLOCK`      | "You cannot block yourself."          |

---

### DELETE `/api/social/block/:userId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario         | Status | Error Code    | Message                     |
| ---------------- | ------ | ------------- | --------------------------- |
| User not blocked | 404    | `NOT_BLOCKED` | "This user is not blocked." |

---

### GET `/api/social/blocks`

**Success Response:** `200 OK`

```json
{
  "blockedUsers": [
    {
      "id": "string",
      "name": "string",
      "username": "string",
      "avatarUrl": "string | null"
    }
  ]
}
```

---

### Internal: GET `/internal/social/check-access/:targetUserId`

**Expected Header:** `X-User-Id` (the requesting user)

**Success Response:** `200 OK`

```json
{
  "hasAccess": true,
  "reason": "public_profile | following | own_profile"
}
```

```json
{
  "hasAccess": false,
  "reason": "private_profile | blocked_by_target | blocked_by_requester"
}
```

**Error Responses:**

| Scenario              | Status | Error Code       | Message           |
| --------------------- | ------ | ---------------- | ----------------- |
| Target user not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

### Internal: GET `/internal/social/following/:userId/list`

**Success Response:** `200 OK`

```json
{
  "followingIds": ["userId1", "userId2", "userId3"]
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| User not found | 404    | `USER_NOT_FOUND` | "User not found." |

---

## 7. Post Service

### POST `/api/posts`

**Expected Request:** `multipart/form-data`

- `media` (required) — up to 20 files (images/videos), max 50MB each
- `description` (optional) — text description

**Success Response:** `201 Created`

```json
{
  "id": "string",
  "description": "string | null",
  "media": [
    {
      "id": "string",
      "url": "string",
      "type": "image | video",
      "order": 0
    }
  ],
  "createdAt": "ISO 8601"
}
```

**Error Responses:**

| Scenario                | Status | Error Code          | Message                                           |
| ----------------------- | ------ | ------------------- | ------------------------------------------------- |
| No media files uploaded | 400    | `NO_MEDIA`          | "At least one image or video is required."        |
| Too many media files    | 400    | `TOO_MANY_MEDIA`    | "A post can contain a maximum of 20 media items." |
| File too large          | 413    | `FILE_TOO_LARGE`    | "Each file must not exceed 50MB."                 |
| Invalid file type       | 415    | `INVALID_FILE_TYPE` | "Only image and video files are allowed."         |

---

### GET `/api/posts/:postId`

**Success Response:** `200 OK`

```json
{
  "id": "string",
  "userId": "string",
  "description": "string | null",
  "media": [
    {
      "id": "string",
      "url": "string",
      "type": "image | video",
      "order": 0
    }
  ],
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "ISO 8601"
}
```

> **Note:** Like and comment counts are fetched from Interaction Service via `/internal/interactions/counts/:postId`.

**Error Responses:**

| Scenario               | Status | Error Code       | Message                                |
| ---------------------- | ------ | ---------------- | -------------------------------------- |
| Post not found         | 404    | `POST_NOT_FOUND` | "Post not found."                      |
| No access to this post | 403    | `ACCESS_DENIED`  | "You do not have access to this post." |
| Post owner blocked you | 404    | `POST_NOT_FOUND` | "Post not found."                      |

> **Note:** Blocked users see 404, not 403, to prevent revealing that the post exists.

---

### PATCH `/api/posts/:postId`

**Expected Request Body:**

```json
{
  "description": "string"
}
```

**Success Response:** `200 OK` — returns updated post

**Error Responses:**

| Scenario           | Status | Error Code       | Message                             |
| ------------------ | ------ | ---------------- | ----------------------------------- |
| Post not found     | 404    | `POST_NOT_FOUND` | "Post not found."                   |
| Not the post owner | 403    | `ACCESS_DENIED`  | "You can only edit your own posts." |
| No fields provided | 400    | `NO_FIELDS`      | "Description field is required."    |

---

### DELETE `/api/posts/:postId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario           | Status | Error Code       | Message                               |
| ------------------ | ------ | ---------------- | ------------------------------------- |
| Post not found     | 404    | `POST_NOT_FOUND` | "Post not found."                     |
| Not the post owner | 403    | `ACCESS_DENIED`  | "You can only delete your own posts." |

---

### DELETE `/api/posts/:postId/media/:mediaId`

**Success Response:** `204 No Content`

> **Note:** If this was the last media item in the post, the entire post is deleted.

**Error Responses:**

| Scenario                | Status | Error Code        | Message                               |
| ----------------------- | ------ | ----------------- | ------------------------------------- |
| Post not found          | 404    | `POST_NOT_FOUND`  | "Post not found."                     |
| Media not found in post | 404    | `MEDIA_NOT_FOUND` | "Media item not found in this post."  |
| Not the post owner      | 403    | `ACCESS_DENIED`   | "You can only modify your own posts." |

---

### GET `/api/posts/user/:userId`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 12)

**Success Response:** `200 OK`

```json
{
  "posts": [
    {
      "id": "string",
      "media": [...],
      "description": "string | null",
      "likeCount": 0,
      "commentCount": 0,
      "createdAt": "ISO 8601"
    }
  ],
  "page": 1,
  "totalPages": 5
}
```

**Error Responses:**

| Scenario                            | Status | Error Code       | Message                    |
| ----------------------------------- | ------ | ---------------- | -------------------------- |
| User not found                      | 404    | `USER_NOT_FOUND` | "User not found."          |
| No access (private + not following) | 403    | `ACCESS_DENIED`  | "This profile is private." |
| Blocked                             | 404    | `USER_NOT_FOUND` | "User not found."          |

---

### Internal: GET `/internal/posts/by-users`

**Query Parameters:**

- `userIds` (required) — comma-separated list of user IDs
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Success Response:** `200 OK`

```json
{
  "posts": [
    {
      "id": "string",
      "userId": "string",
      "description": "string | null",
      "media": [...],
      "createdAt": "ISO 8601"
    }
  ],
  "page": 1,
  "totalPages": 10
}
```

**Error Responses:**

| Scenario                  | Status | Error Code       | Message                                  |
| ------------------------- | ------ | ---------------- | ---------------------------------------- |
| Missing userIds parameter | 400    | `MISSING_FIELDS` | "Query parameter 'userIds' is required." |

---

### Internal: GET `/internal/posts/:postId/exists`

**Success Response:** `200 OK`

```json
{
  "exists": true,
  "ownerId": "string"
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| Post not found | 404    | `POST_NOT_FOUND` | "Post not found." |

---

## 8. Interaction Service

### POST `/api/interactions/likes/:postId`

**Success Response:** `201 Created`

```json
{
  "message": "Post liked."
}
```

**Error Responses:**

| Scenario                        | Status | Error Code       | Message                                |
| ------------------------------- | ------ | ---------------- | -------------------------------------- |
| Post not found                  | 404    | `POST_NOT_FOUND` | "Post not found."                      |
| Already liked                   | 409    | `ALREADY_LIKED`  | "You have already liked this post."    |
| No access to post               | 403    | `ACCESS_DENIED`  | "You do not have access to this post." |
| Cannot like own post (optional) | 400    | `SELF_LIKE`      | "You cannot like your own post."       |

---

### DELETE `/api/interactions/likes/:postId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario             | Status | Error Code       | Message                         |
| -------------------- | ------ | ---------------- | ------------------------------- |
| Post not found       | 404    | `POST_NOT_FOUND` | "Post not found."               |
| Not previously liked | 404    | `NOT_LIKED`      | "You have not liked this post." |

---

### GET `/api/interactions/likes/:postId`

**Success Response:** `200 OK`

```json
{
  "postId": "string",
  "likeCount": 0
}
```

**Error Responses:**

| Scenario          | Status | Error Code       | Message                                |
| ----------------- | ------ | ---------------- | -------------------------------------- |
| Post not found    | 404    | `POST_NOT_FOUND` | "Post not found."                      |
| No access to post | 403    | `ACCESS_DENIED`  | "You do not have access to this post." |

---

### POST `/api/interactions/comments/:postId`

**Expected Request Body:**

```json
{
  "text": "string (required)"
}
```

**Success Response:** `201 Created`

```json
{
  "id": "string",
  "postId": "string",
  "userId": "string",
  "text": "string",
  "createdAt": "ISO 8601"
}
```

**Error Responses:**

| Scenario          | Status | Error Code       | Message                                |
| ----------------- | ------ | ---------------- | -------------------------------------- |
| Post not found    | 404    | `POST_NOT_FOUND` | "Post not found."                      |
| Missing text      | 400    | `MISSING_FIELDS` | "Comment text is required."            |
| Empty text        | 400    | `INVALID_FIELDS` | "Comment text cannot be empty."        |
| No access to post | 403    | `ACCESS_DENIED`  | "You do not have access to this post." |

---

### GET `/api/interactions/comments/:postId`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Success Response:** `200 OK`

```json
{
  "comments": [
    {
      "id": "string",
      "userId": "string",
      "username": "string",
      "avatarUrl": "string | null",
      "text": "string",
      "createdAt": "ISO 8601"
    }
  ],
  "page": 1,
  "totalPages": 3,
  "totalCount": 50
}
```

**Error Responses:**

| Scenario          | Status | Error Code       | Message                                |
| ----------------- | ------ | ---------------- | -------------------------------------- |
| Post not found    | 404    | `POST_NOT_FOUND` | "Post not found."                      |
| No access to post | 403    | `ACCESS_DENIED`  | "You do not have access to this post." |

---

### PUT `/api/interactions/comments/:commentId`

**Expected Request Body:**

```json
{
  "text": "string (required)"
}
```

**Success Response:** `200 OK` — returns updated comment

**Error Responses:**

| Scenario               | Status | Error Code          | Message                                |
| ---------------------- | ------ | ------------------- | -------------------------------------- |
| Comment not found      | 404    | `COMMENT_NOT_FOUND` | "Comment not found."                   |
| Not the comment author | 403    | `ACCESS_DENIED`     | "You can only edit your own comments." |
| Missing text           | 400    | `MISSING_FIELDS`    | "Comment text is required."            |
| Empty text             | 400    | `INVALID_FIELDS`    | "Comment text cannot be empty."        |

---

### DELETE `/api/interactions/comments/:commentId`

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario               | Status | Error Code          | Message                                  |
| ---------------------- | ------ | ------------------- | ---------------------------------------- |
| Comment not found      | 404    | `COMMENT_NOT_FOUND` | "Comment not found."                     |
| Not the comment author | 403    | `ACCESS_DENIED`     | "You can only delete your own comments." |

---

### Internal: GET `/internal/interactions/counts/:postId`

**Success Response:** `200 OK`

```json
{
  "postId": "string",
  "likeCount": 0,
  "commentCount": 0
}
```

**Error Responses:**

| Scenario       | Status | Error Code       | Message           |
| -------------- | ------ | ---------------- | ----------------- |
| Post not found | 404    | `POST_NOT_FOUND` | "Post not found." |

---

### Internal: GET `/internal/interactions/counts/batch`

**Query Parameters:**

- `postIds` (required) — comma-separated list of post IDs

**Success Response:** `200 OK`

```json
{
  "counts": [
    { "postId": "string", "likeCount": 0, "commentCount": 0 },
    { "postId": "string", "likeCount": 0, "commentCount": 0 }
  ]
}
```

**Error Responses:**

| Scenario                  | Status | Error Code       | Message                                  |
| ------------------------- | ------ | ---------------- | ---------------------------------------- |
| Missing postIds parameter | 400    | `MISSING_FIELDS` | "Query parameter 'postIds' is required." |

---

### Internal: DELETE `/internal/interactions/purge`

**Query Parameters:**

- `userA` (required) — ID of the first user
- `userB` (required) — ID of the second user

**Success Response:** `204 No Content`

**Error Responses:**

| Scenario                | Status | Error Code       | Message                                              |
| ----------------------- | ------ | ---------------- | ---------------------------------------------------- |
| Missing user parameters | 400    | `MISSING_FIELDS` | "Query parameters 'userA' and 'userB' are required." |

## 9. Feed Service

### GET `/api/feed`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Success Response:** `200 OK`

```json
{
  "posts": [
    {
      "id": "string",
      "user": {
        "id": "string",
        "username": "string",
        "avatarUrl": "string | null"
      },
      "description": "string | null",
      "media": [
        {
          "id": "string",
          "url": "string",
          "type": "image | video",
          "order": 0
        }
      ],
      "likeCount": 0,
      "commentCount": 0,
      "createdAt": "ISO 8601"
    }
  ],
  "page": 1,
  "totalPages": 10
}
```

**Error Responses:**

| Scenario                   | Status | Error Code            | Message                                                              |
| -------------------------- | ------ | --------------------- | -------------------------------------------------------------------- |
| User follows nobody        | 200    | —                     | Returns `{ "posts": [], "page": 1, "totalPages": 0 }` (not an error) |
| Social Service unreachable | 502    | `SERVICE_UNAVAILABLE` | "Unable to load feed. Please try again."                             |
| Post Service unreachable   | 502    | `SERVICE_UNAVAILABLE` | "Unable to load feed. Please try again."                             |

---

### GET `/api/feed/refresh`

Same response format and errors as `GET /api/feed`. Forces fetching the latest posts (bypasses any cache if implemented).
