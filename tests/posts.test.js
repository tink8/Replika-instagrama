import { describe, it, expect, beforeAll } from "@jest/globals";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { get, post, patch, del, createTestUser } from "./setup.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Helper: create a post with a tiny 1×1 PNG image.
 * Returns the parsed response body.
 */
async function createTestPost(token, description = "Test post") {
  // 1×1 red PNG (68 bytes)
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

  const res = await post("/api/posts", {
    body: form,
    token,
  });

  return res;
}

describe("Post Service", () => {
  /** ───── POST /api/posts ───── */

  describe("POST /api/posts", () => {
    let user;

    beforeAll(async () => {
      user = await createTestUser();
    });

    it("should create a post with an image (201)", async () => {
      const res = await createTestPost(user.accessToken, "My first post");

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("description", "My first post");
      expect(res.body).toHaveProperty("media");
      expect(Array.isArray(res.body.media)).toBe(true);
      expect(res.body.media.length).toBe(1);
      expect(res.body.media[0]).toHaveProperty("url");
      expect(res.body.media[0]).toHaveProperty("type");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should reject a post with no media (400 NO_MEDIA)", async () => {
      const form = new FormData();
      form.append("description", "No image post");

      const res = await post("/api/posts", {
        body: form,
        token: user.accessToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NO_MEDIA");
    });
  });

  /** ───── GET /api/posts/:postId ───── */

  describe("GET /api/posts/:postId", () => {
    let owner;
    let viewer;
    let postId;

    beforeAll(async () => {
      owner = await createTestUser();
      viewer = await createTestUser();

      const created = await createTestPost(owner.accessToken, "Viewable post");
      postId = created.body.id;
    });

    it("should return a post by ID (200)", async () => {
      const res = await get(`/api/posts/${postId}`, {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", postId);
      expect(res.body).toHaveProperty("userId", owner.userId);
      expect(res.body).toHaveProperty("description");
      expect(res.body).toHaveProperty("media");
      expect(res.body).toHaveProperty("likeCount");
      expect(res.body).toHaveProperty("commentCount");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should return 404 for non-existent post (POST_NOT_FOUND)", async () => {
      const res = await get(
        "/api/posts/00000000-0000-0000-0000-000000000000",
        { token: viewer.accessToken },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("POST_NOT_FOUND");
    });

    it("should deny access to post of a private user (403 ACCESS_DENIED)", async () => {
      const privateUser = await createTestUser();
      const outsider = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      const created = await createTestPost(
        privateUser.accessToken,
        "Private post",
      );

      const res = await get(`/api/posts/${created.body.id}`, {
        token: outsider.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });
  });

  /** ───── PATCH /api/posts/:postId ───── */

  describe("PATCH /api/posts/:postId", () => {
    let owner;
    let otherUser;
    let postId;

    beforeAll(async () => {
      owner = await createTestUser();
      otherUser = await createTestUser();

      const created = await createTestPost(owner.accessToken, "Original desc");
      postId = created.body.id;
    });

    it("should update post description (200)", async () => {
      const res = await patch(`/api/posts/${postId}`, {
        token: owner.accessToken,
        body: { description: "Updated description" },
      });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Updated description");
    });

    it("should reject update by non-owner (403 ACCESS_DENIED)", async () => {
      const res = await patch(`/api/posts/${postId}`, {
        token: otherUser.accessToken,
        body: { description: "Hacked!" },
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });

    it("should return 404 for non-existent post (POST_NOT_FOUND)", async () => {
      const res = await patch(
        "/api/posts/00000000-0000-0000-0000-000000000000",
        {
          token: owner.accessToken,
          body: { description: "Ghost" },
        },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("POST_NOT_FOUND");
    });
  });

  /** ───── DELETE /api/posts/:postId ───── */

  describe("DELETE /api/posts/:postId", () => {
    it("should delete own post (204)", async () => {
      const owner = await createTestUser();
      const created = await createTestPost(owner.accessToken, "To be deleted");

      const res = await del(`/api/posts/${created.body.id}`, {
        token: owner.accessToken,
      });

      expect(res.status).toBe(204);

      // Verify it's gone
      const check = await get(`/api/posts/${created.body.id}`, {
        token: owner.accessToken,
      });
      expect(check.status).toBe(404);
    });

    it("should reject delete by non-owner (403 ACCESS_DENIED)", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();
      const created = await createTestPost(owner.accessToken, "Not yours");

      const res = await del(`/api/posts/${created.body.id}`, {
        token: other.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });

    it("should return 404 for non-existent post (POST_NOT_FOUND)", async () => {
      const user = await createTestUser();

      const res = await del(
        "/api/posts/00000000-0000-0000-0000-000000000000",
        { token: user.accessToken },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("POST_NOT_FOUND");
    });
  });

  /** ───── DELETE /api/posts/:postId/media/:mediaId ───── */

  describe("DELETE /api/posts/:postId/media/:mediaId", () => {
    it("should remove a media item from a multi-media post (204)", async () => {
      const owner = await createTestUser();

      // Create post with one image
      const created = await createTestPost(owner.accessToken, "Multi media");
      const postId = created.body.id;

      // Add a second image to have 2 media
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64",
      );
      const form = new FormData();
      form.append("description", "Two images");
      form.append(
        "media",
        new Blob([pngBuffer], { type: "image/png" }),
        "img1.png",
      );
      form.append(
        "media",
        new Blob([pngBuffer], { type: "image/png" }),
        "img2.png",
      );

      const twoMediaPost = await post("/api/posts", {
        body: form,
        token: owner.accessToken,
      });

      expect(twoMediaPost.body.media.length).toBe(2);

      const mediaIdToRemove = twoMediaPost.body.media[0].id;

      const res = await del(
        `/api/posts/${twoMediaPost.body.id}/media/${mediaIdToRemove}`,
        { token: owner.accessToken },
      );

      expect(res.status).toBe(204);

      // Verify media is gone but post still exists
      const updated = await get(`/api/posts/${twoMediaPost.body.id}`, {
        token: owner.accessToken,
      });
      expect(updated.status).toBe(200);
      expect(updated.body.media.length).toBe(1);
    });

    it("should reject removal by non-owner (403 ACCESS_DENIED)", async () => {
      const owner = await createTestUser();
      const other = await createTestUser();

      const created = await createTestPost(owner.accessToken, "Not yours");
      const mediaId = created.body.media[0].id;

      const res = await del(
        `/api/posts/${created.body.id}/media/${mediaId}`,
        { token: other.accessToken },
      );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });

    it("should return 404 for non-existent media (MEDIA_NOT_FOUND)", async () => {
      const owner = await createTestUser();
      const created = await createTestPost(owner.accessToken, "Has media");

      const res = await del(
        `/api/posts/${created.body.id}/media/00000000-0000-0000-0000-000000000000`,
        { token: owner.accessToken },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("MEDIA_NOT_FOUND");
    });
  });

  /** ───── GET /api/posts/user/:userId ───── */

  describe("GET /api/posts/user/:userId", () => {
    let owner;
    let viewer;

    beforeAll(async () => {
      owner = await createTestUser();
      viewer = await createTestUser();

      await createTestPost(owner.accessToken, "Gallery post 1");
      await createTestPost(owner.accessToken, "Gallery post 2");
    });

    it("should return posts for a public user (200)", async () => {
      const res = await get(`/api/posts/user/${owner.userId}`, {
        token: viewer.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("posts");
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBeGreaterThanOrEqual(2);
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("totalPages");
    });

    it("should deny access to private user's posts (403 ACCESS_DENIED)", async () => {
      const privateUser = await createTestUser();
      const outsider = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      await createTestPost(privateUser.accessToken, "Secret post");

      const res = await get(`/api/posts/user/${privateUser.userId}`, {
        token: outsider.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });
  });
});
