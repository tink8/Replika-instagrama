# Instagram Clone Frontend

A fully functional, responsive, and strictly typed frontend for an Instagram-like social media application. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **Icons:** Lucide React
- **API Communication:** Native `fetch` with a custom wrapper for JWT handling

## ✨ Features

### Authentication & Authorization

- User Registration & Login.
- JWT-based authentication (Access & Refresh tokens).
- Automatic token refresh mechanism on 401 Unauthorized responses.
- Protected routes (users must be logged in to view the feed, profile, etc.).

### User Profiles

- View user profiles (avatar, bio, followers/following counts).
- Follow and unfollow other users with optimistic UI updates.
- Grid view of a user's posts with hover effects showing likes and comments.
- Edit Profile functionality (update name, bio, privacy settings, and upload a new avatar).

### Posts & Feed

- Scrollable feed of posts from followed users.
- Create new posts with image/video uploads and captions.
- Like and unlike posts.
- View a single post in detail.

### Comments

- Dedicated comment section for each post.
- View existing comments and post new ones in real-time.

### Search

- Search functionality to find and discover other users.

## 📂 Project Structure

```text
src/
├── components/
│   ├── CommentSection.tsx  # Handles displaying and submitting comments
│   ├── Layout.tsx          # Main application wrapper with Navbar/Sidebar
│   └── PostCard.tsx        # Reusable component for displaying a post in the feed
├── context/
│   └── AuthContext.tsx     # Global state for user authentication & session management
├── pages/
│   ├── CreatePost.tsx      # Form for uploading new media
│   ├── EditProfile.tsx     # Settings page for updating user info
│   ├── Feed.tsx            # Main home page feed
│   ├── Login.tsx           # User login page
│   ├── Profile.tsx         # User profile and post grid
│   ├── Register.tsx        # New user registration
│   ├── Search.tsx          # User search interface
│   └── SinglePost.tsx      # Detailed view of a specific post
├── types/
│   └── api.ts              # Strict TypeScript interfaces for all API responses/requests
└── utils/
    └── apiClient.ts        # Custom fetch wrapper handling headers and token refreshes
```

## 🔐 API Client & JWT Flow

All API requests are routed through `src/utils/apiClient.ts`. This custom wrapper provides several benefits:

1.  **Automatic Headers:** Automatically attaches the `Authorization: Bearer <token>` header to every request.
2.  **JSON Parsing:** Automatically stringifies request bodies and parses JSON responses.
3.  **Token Refresh:** If an API request fails with a `401 Unauthorized` error, the client automatically attempts to use the `refresh_token` to get a new `access_token`, and then seamlessly retries the original request.

## 🛠️ Setup & Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start the development server:**
    ```bash
    npm run dev
    ```
3.  **Build for production:**
    ```bash
    npm run build
    ```
