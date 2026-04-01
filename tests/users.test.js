import { describe, it, expect, beforeAll } from "@jest/globals";
import { get, patch, del, post, createTestUser } from "./setup.js";

describe("User Service", () => {
  /** ───── GET /api/users/me ───── */

  describe("GET /api/users/me", () => {
    let user;

    beforeAll(async () => {
      user = await createTestUser();
    });

    it("should return current user profile (200)", async () => {
      const res = await get("/api/users/me", { token: user.accessToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", user.userId);
      expect(res.body).toHaveProperty("username", user.username);
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("bio");
      expect(res.body).toHaveProperty("avatarUrl");
      expect(res.body).toHaveProperty("isPrivate");
    });

    it("should reject without token (401 TOKEN_MISSING)", async () => {
      const res = await get("/api/users/me");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("TOKEN_MISSING");
    });
  });

  /** ───── PATCH /api/users/me ───── */

  describe("PATCH /api/users/me", () => {
    let user;

    beforeAll(async () => {
      user = await createTestUser();
    });

    it("should update name (200)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { name: "Updated Name" },
      });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
    });

    it("should update bio (200)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { bio: "A new bio for testing." },
      });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe("A new bio for testing.");
    });

    it("should update privacy setting (200)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { isPrivate: true },
      });

      expect(res.status).toBe(200);
      expect(res.body.isPrivate).toBe(true);

      // Revert back
      await patch("/api/users/me", {
        token: user.accessToken,
        body: { isPrivate: false },
      });
    });

    it("should reject empty username (400 VALIDATION_ERROR)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { username: "" },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject whitespace-only username (400 VALIDATION_ERROR)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { username: "   " },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject duplicate username (409 USERNAME_TAKEN)", async () => {
      const otherUser = await createTestUser();

      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: { username: otherUser.username },
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("USERNAME_TAKEN");
    });

    it("should reject no fields provided (400 NO_FIELDS)", async () => {
      const res = await patch("/api/users/me", {
        token: user.accessToken,
        body: {},
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NO_FIELDS");
    });
  });

  /** ───── GET /api/users/search?q= ───── */

  describe("GET /api/users/search", () => {
    let user;
    let searchableUser;

    beforeAll(async () => {
      user = await createTestUser();
      searchableUser = await createTestUser({
        name: "SearchableUser",
        username: `searchable_${Date.now()}`,
      });
    });

    it("should return matching users (200)", async () => {
      const res = await get(
        `/api/users/search?q=${searchableUser.username}`,
        { token: user.accessToken },
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);

      const found = res.body.users.find((u) => u.id === searchableUser.userId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty("username", searchableUser.username);
      expect(found).toHaveProperty("name");
      expect(found).toHaveProperty("avatarUrl");
    });

    it("should return empty array for no matches (200)", async () => {
      const res = await get("/api/users/search?q=zzz_nonexistent_zzz", {
        token: user.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(0);
    });

    it("should reject missing query parameter (400 MISSING_QUERY)", async () => {
      const res = await get("/api/users/search", {
        token: user.accessToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_QUERY");
    });
  });

  /** ───── GET /api/users/:userId ───── */

  describe("GET /api/users/:userId", () => {
    let viewer;
    let publicUser;
    let privateUser;

    beforeAll(async () => {
      viewer = await createTestUser();
      publicUser = await createTestUser();
      privateUser = await createTestUser();

      // Make privateUser private
      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });
    });

    it("should return a public profile with posts (200)", async () => {
      const res = await get(`/api/users/${publicUser.userId}`, {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", publicUser.userId);
      expect(res.body).toHaveProperty("username", publicUser.username);
      expect(res.body).toHaveProperty("followerCount");
      expect(res.body).toHaveProperty("followingCount");
      expect(res.body).toHaveProperty("followStatus");
      expect(res.body).toHaveProperty("postCount");
      // Public profile — posts should be an array (possibly empty)
      expect(Array.isArray(res.body.posts)).toBe(true);
    });

    it("should return a private profile with counts but posts = null (200)", async () => {
      const res = await get(`/api/users/${privateUser.userId}`, {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", privateUser.userId);
      expect(res.body).toHaveProperty("followerCount");
      expect(res.body).toHaveProperty("followingCount");
      expect(res.body).toHaveProperty("postCount");
      expect(typeof res.body.postCount).toBe("number");
      // Private profile — posts should be null (no access)
      expect(res.body.posts).toBeNull();
    });

    it("should return own profile even if private (200)", async () => {
      const res = await get(`/api/users/${privateUser.userId}`, {
        token: privateUser.accessToken,
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.posts)).toBe(true);
    });

    it("should return 404 for non-existent user (USER_NOT_FOUND)", async () => {
      const res = await get("/api/users/00000000-0000-0000-0000-000000000000", {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("should return 404 for blocked user (USER_NOT_FOUND)", async () => {
      const blocker = await createTestUser();
      const target = await createTestUser();

      // blocker blocks target
      await post(`/api/social/block/${target.userId}`, {
        token: blocker.accessToken,
      });

      // target tries to view blocker's profile
      const res = await get(`/api/users/${blocker.userId}`, {
        token: target.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  /** ───── DELETE /api/users/me/avatar ───── */

  describe("DELETE /api/users/me/avatar", () => {
    it("should return 404 when no avatar exists (AVATAR_NOT_FOUND)", async () => {
      const user = await createTestUser();

      const res = await del("/api/users/me/avatar", {
        token: user.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("AVATAR_NOT_FOUND");
    });
  });
});
