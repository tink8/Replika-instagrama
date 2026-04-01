import { describe, it, expect, beforeAll } from "@jest/globals";
import { get, post, patch, createTestUser } from "./setup.js";

/** Helper: create a post with a tiny 1×1 PNG */
async function createTestPost(token, description = "Test post") {
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64",
  );

  const form = new FormData();
  form.append("description", description);
  form.append(
    "media",
    new Blob([pngBuffer], { type: "image/png" }),
    "test.png",
  );

  const res = await post("/api/posts", { body: form, token });
  return res.body;
}

describe("Feed Service", () => {
  /** ───── GET /api/feed ───── */

  describe("GET /api/feed", () => {
    it("should return empty feed when user follows nobody (200)", async () => {
      const loner = await createTestUser();

      const res = await get("/api/feed", { token: loner.accessToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("posts");
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts).toHaveLength(0);
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("totalPages");
    });

    it("should return posts from followed users (200)", async () => {
      const poster = await createTestUser();
      const viewer = await createTestUser();

      // poster creates a post
      await createTestPost(poster.accessToken, "Feed post");

      // viewer follows poster
      await post(`/api/social/follow/${poster.userId}`, {
        token: viewer.accessToken,
      });

      // Use refresh endpoint to bypass cache
      const res = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeGreaterThanOrEqual(1);

      const feedPost = res.body.posts.find(
        (p) => p.description === "Feed post",
      );
      expect(feedPost).toBeDefined();
      expect(feedPost).toHaveProperty("id");
      expect(feedPost).toHaveProperty("user");
      expect(feedPost.user).toHaveProperty("id", poster.userId);
      expect(feedPost.user).toHaveProperty("username", poster.username);
      expect(feedPost).toHaveProperty("media");
      expect(feedPost).toHaveProperty("likeCount");
      expect(feedPost).toHaveProperty("commentCount");
      expect(feedPost).toHaveProperty("createdAt");
    });

    it("should not include posts from unfollowed users", async () => {
      const poster = await createTestUser();
      const viewer = await createTestUser();

      await createTestPost(poster.accessToken, "Unfollowed post");

      // viewer does NOT follow poster — feed should not include their posts
      const res = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      const found = res.body.posts.find(
        (p) => p.user && p.user.id === poster.userId,
      );
      expect(found).toBeUndefined();
    });

    it("should reject without token (401 TOKEN_MISSING)", async () => {
      const res = await get("/api/feed");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("TOKEN_MISSING");
    });
  });

  /** ───── GET /api/feed/refresh ───── */

  describe("GET /api/feed/refresh", () => {
    it("should return fresh feed bypassing cache (200)", async () => {
      const poster = await createTestUser();
      const viewer = await createTestUser();

      await post(`/api/social/follow/${poster.userId}`, {
        token: viewer.accessToken,
      });

      // Load feed to populate cache
      await get("/api/feed", { token: viewer.accessToken });

      // Poster creates a new post
      await createTestPost(poster.accessToken, "Fresh post after cache");

      // Refresh should pick it up immediately
      const res = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      const found = res.body.posts.find(
        (p) => p.description === "Fresh post after cache",
      );
      expect(found).toBeDefined();
    });

    it("should not show posts from blocked users", async () => {
      const poster = await createTestUser();
      const viewer = await createTestUser();

      await post(`/api/social/follow/${poster.userId}`, {
        token: viewer.accessToken,
      });

      await createTestPost(poster.accessToken, "Soon blocked post");

      // Verify post is in feed first
      const before = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });
      const foundBefore = before.body.posts.find(
        (p) => p.user && p.user.id === poster.userId,
      );
      expect(foundBefore).toBeDefined();

      // Block the poster
      await post(`/api/social/block/${poster.userId}`, {
        token: viewer.accessToken,
      });

      // Refresh feed — blocked user's posts should be gone
      const after = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });
      const foundAfter = after.body.posts.find(
        (p) => p.user && p.user.id === poster.userId,
      );
      expect(foundAfter).toBeUndefined();
    });

    it("should not show posts from users who blocked you", async () => {
      const poster = await createTestUser();
      const viewer = await createTestUser();

      await post(`/api/social/follow/${poster.userId}`, {
        token: viewer.accessToken,
      });

      await createTestPost(poster.accessToken, "Blocker post");

      // Poster blocks viewer
      await post(`/api/social/block/${viewer.userId}`, {
        token: poster.accessToken,
      });

      const res = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      const found = res.body.posts.find(
        (p) => p.user && p.user.id === poster.userId,
      );
      expect(found).toBeUndefined();
    });
  });

  /** ───── Feed with private users ───── */

  describe("Feed & privacy", () => {
    it("should show posts from a private user you follow (after accept)", async () => {
      const privateUser = await createTestUser();
      const viewer = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      await createTestPost(privateUser.accessToken, "Private feed post");

      // Send follow request
      await post(`/api/social/follow/${privateUser.userId}`, {
        token: viewer.accessToken,
      });

      // Accept request
      const requests = await get("/api/social/requests", {
        token: privateUser.accessToken,
      });
      const req = requests.body.requests.find(
        (r) => r.from && r.from.id === viewer.userId,
      );

      await import("./setup.js").then(({ put }) =>
        put(`/api/social/requests/${req.id}/accept`, {
          token: privateUser.accessToken,
        }),
      );

      // Now feed should include the private user's posts
      const res = await get("/api/feed/refresh", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      const found = res.body.posts.find(
        (p) => p.description === "Private feed post",
      );
      expect(found).toBeDefined();
    });
  });
});
