import { describe, it, expect, beforeAll } from "@jest/globals";
import { get, post, del, put, patch, createTestUser } from "./setup.js";

describe("Social Service", () => {
  /** ───── POST /api/social/follow/:userId ───── */

  describe("POST /api/social/follow/:userId", () => {
    let follower;
    let publicUser;
    let privateUser;

    beforeAll(async () => {
      follower = await createTestUser();
      publicUser = await createTestUser();
      privateUser = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });
    });

    it("should follow a public user immediately (201, status 'following')", async () => {
      const res = await post(`/api/social/follow/${publicUser.userId}`, {
        token: follower.accessToken,
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("following");
    });

    it("should send a follow request to a private user (201, status 'requested')", async () => {
      const res = await post(`/api/social/follow/${privateUser.userId}`, {
        token: follower.accessToken,
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("requested");
    });

    it("should reject duplicate follow (409 ALREADY_FOLLOWING)", async () => {
      const res = await post(`/api/social/follow/${publicUser.userId}`, {
        token: follower.accessToken,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_FOLLOWING");
    });

    it("should reject duplicate follow request (409 REQUEST_PENDING)", async () => {
      const res = await post(`/api/social/follow/${privateUser.userId}`, {
        token: follower.accessToken,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("REQUEST_PENDING");
    });

    it("should reject following yourself (400 SELF_FOLLOW)", async () => {
      const res = await post(`/api/social/follow/${follower.userId}`, {
        token: follower.accessToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SELF_FOLLOW");
    });

    it("should reject following a user you blocked (403 BLOCKED)", async () => {
      const blocker = await createTestUser();
      const target = await createTestUser();

      await post(`/api/social/block/${target.userId}`, {
        token: blocker.accessToken,
      });

      const res = await post(`/api/social/follow/${target.userId}`, {
        token: blocker.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("BLOCKED");
    });

    it("should reject following a user who blocked you (403 BLOCKED)", async () => {
      const blocker = await createTestUser();
      const victim = await createTestUser();

      await post(`/api/social/block/${victim.userId}`, {
        token: blocker.accessToken,
      });

      const res = await post(`/api/social/follow/${blocker.userId}`, {
        token: victim.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("BLOCKED");
    });
  });

  /** ───── DELETE /api/social/follow/:userId (unfollow) ───── */

  describe("DELETE /api/social/follow/:userId", () => {
    it("should unfollow a user (204)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await del(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(204);
    });

    it("should reject unfollowing someone you don't follow (404 NOT_FOLLOWING)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const res = await del(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOLLOWING");
    });
  });

  /** ───── GET /api/social/follow/status/:userId ───── */

  describe("GET /api/social/follow/status/:userId", () => {
    it("should return 'none' for no relationship", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const res = await get(`/api/social/follow/status/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("none");
    });

    it("should return 'following' after following", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await get(`/api/social/follow/status/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("following");
    });

    it("should return 'requested' for pending private follow", async () => {
      const userA = await createTestUser();
      const privateUser = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      await post(`/api/social/follow/${privateUser.userId}`, {
        token: userA.accessToken,
      });

      const res = await get(`/api/social/follow/status/${privateUser.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("requested");
    });
  });

  /** ───── GET /api/social/counts/:userId ───── */

  describe("GET /api/social/counts/:userId", () => {
    it("should return follower and following counts (200)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await get(`/api/social/counts/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("followerCount");
      expect(res.body).toHaveProperty("followingCount");
      expect(res.body.followerCount).toBeGreaterThanOrEqual(1);
    });
  });

  /** ───── Follow Requests (accept / decline) ───── */

  describe("Follow Requests", () => {
    let requester;
    let privateOwner;

    beforeAll(async () => {
      requester = await createTestUser();
      privateOwner = await createTestUser();

      await patch("/api/users/me", {
        token: privateOwner.accessToken,
        body: { isPrivate: true },
      });

      await post(`/api/social/follow/${privateOwner.userId}`, {
        token: requester.accessToken,
      });
    });

    it("should list pending requests (200)", async () => {
      const res = await get("/api/social/requests", {
        token: privateOwner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("requests");
      expect(Array.isArray(res.body.requests)).toBe(true);
      expect(res.body.requests.length).toBeGreaterThanOrEqual(1);

      const req = res.body.requests.find(
        (r) => r.from && r.from.id === requester.userId,
      );
      expect(req).toBeDefined();
      expect(req.from).toHaveProperty("username", requester.username);
    });

    it("should accept a follow request (200)", async () => {
      // Get the request ID first
      const list = await get("/api/social/requests", {
        token: privateOwner.accessToken,
      });
      const req = list.body.requests.find(
        (r) => r.from && r.from.id === requester.userId,
      );

      const res = await put(`/api/social/requests/${req.id}/accept`, {
        token: privateOwner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Follow request accepted.");

      // Verify requester is now following
      const status = await get(
        `/api/social/follow/status/${privateOwner.userId}`,
        { token: requester.accessToken },
      );
      expect(status.body.status).toBe("following");
    });

    it("should decline a follow request (200)", async () => {
      const newRequester = await createTestUser();

      await post(`/api/social/follow/${privateOwner.userId}`, {
        token: newRequester.accessToken,
      });

      const list = await get("/api/social/requests", {
        token: privateOwner.accessToken,
      });
      const req = list.body.requests.find(
        (r) => r.from && r.from.id === newRequester.userId,
      );

      const res = await put(`/api/social/requests/${req.id}/decline`, {
        token: privateOwner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Follow request declined.");
    });

    it("should reject managing a non-existent request (404 REQUEST_NOT_FOUND)", async () => {
      const res = await put("/api/social/requests/999999/accept", {
        token: privateOwner.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("REQUEST_NOT_FOUND");
    });
  });

  /** ───── GET /api/social/followers/:userId & following ───── */

  describe("Followers & Following lists", () => {
    let userA;
    let userB;

    beforeAll(async () => {
      userA = await createTestUser();
      userB = await createTestUser();

      // A follows B
      await post(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });
    });

    it("should list followers (200)", async () => {
      const res = await get(`/api/social/followers/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("followers");
      expect(Array.isArray(res.body.followers)).toBe(true);

      const found = res.body.followers.find((f) => f.id === userA.userId);
      expect(found).toBeDefined();
    });

    it("should list following (200)", async () => {
      const res = await get(`/api/social/following/${userA.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("following");

      const found = res.body.following.find((f) => f.id === userB.userId);
      expect(found).toBeDefined();
    });

    it("should reject followers list for private profile without access (403)", async () => {
      const privateUser = await createTestUser();
      const outsider = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      const res = await get(`/api/social/followers/${privateUser.userId}`, {
        token: outsider.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });
  });

  /** ───── Blocking ───── */

  describe("Blocking", () => {
    it("should block a user (201)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const res = await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User blocked.");
    });

    it("should reject duplicate block (409 ALREADY_BLOCKED)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_BLOCKED");
    });

    it("should reject blocking yourself (400 SELF_BLOCK)", async () => {
      const userA = await createTestUser();

      const res = await post(`/api/social/block/${userA.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SELF_BLOCK");
    });

    it("should list blocked users (200)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await get("/api/social/blocks", {
        token: userA.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("blockedUsers");
      const found = res.body.blockedUsers.find((u) => u.id === userB.userId);
      expect(found).toBeDefined();
    });

    it("should unblock a user (204)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      const res = await del(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(204);
    });

    it("should reject unblocking someone not blocked (404 NOT_BLOCKED)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const res = await del(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_BLOCKED");
    });

    it("should auto-unfollow both directions when blocking (204)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      // Mutual follow
      await post(`/api/social/follow/${userB.userId}`, {
        token: userA.accessToken,
      });
      await post(`/api/social/follow/${userA.userId}`, {
        token: userB.accessToken,
      });

      // A blocks B
      await post(`/api/social/block/${userB.userId}`, {
        token: userA.accessToken,
      });

      // B should no longer be following A
      const statusB = await get(`/api/social/follow/status/${userA.userId}`, {
        token: userB.accessToken,
      });
      expect(statusB.body.status).not.toBe("following");

      // A should no longer be following B
      const statusA = await get(`/api/social/follow/status/${userB.userId}`, {
        token: userA.accessToken,
      });
      expect(statusA.body.status).not.toBe("following");
    });
  });

  /** ───── DELETE /api/social/followers/:userId (remove follower) ───── */

  describe("DELETE /api/social/followers/:userId", () => {
    it("should remove a follower (204)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      // B follows A
      await post(`/api/social/follow/${userA.userId}`, {
        token: userB.accessToken,
      });

      // A removes B from followers
      const res = await del(`/api/social/followers/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(204);
    });

    it("should reject removing a non-follower (404 NOT_A_FOLLOWER)", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const res = await del(`/api/social/followers/${userB.userId}`, {
        token: userA.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_A_FOLLOWER");
    });
  });
});
