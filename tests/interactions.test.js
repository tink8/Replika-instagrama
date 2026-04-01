import { describe, it, expect, beforeAll } from "@jest/globals";
import { get, post, put, del, patch, createTestUser } from "./setup.js";

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

describe("Interaction Service", () => {
  /** ───── Likes ───── */

  describe("POST /api/interactions/likes/:postId", () => {
    let liker;
    let owner;
    let postId;

    beforeAll(async () => {
      owner = await createTestUser();
      liker = await createTestUser();
      const p = await createTestPost(owner.accessToken);
      postId = p.id;
    });

    it("should like a post (201)", async () => {
      const res = await post(`/api/interactions/likes/${postId}`, {
        token: liker.accessToken,
      });

      expect(res.status).toBe(201);
    });

    it("should reject duplicate like (409 ALREADY_LIKED)", async () => {
      const res = await post(`/api/interactions/likes/${postId}`, {
        token: liker.accessToken,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_LIKED");
    });

    it("should reject liking a non-existent post (404 POST_NOT_FOUND)", async () => {
      const res = await post(
        "/api/interactions/likes/00000000-0000-0000-0000-000000000000",
        { token: liker.accessToken },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("POST_NOT_FOUND");
    });

    it("should reject liking a post on a private profile without access (403)", async () => {
      const privateUser = await createTestUser();
      const outsider = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      const p = await createTestPost(privateUser.accessToken, "Private");

      const res = await post(`/api/interactions/likes/${p.id}`, {
        token: outsider.accessToken,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });
  });

  describe("DELETE /api/interactions/likes/:postId", () => {
    it("should unlike a post (204)", async () => {
      const owner = await createTestUser();
      const liker = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      await post(`/api/interactions/likes/${p.id}`, {
        token: liker.accessToken,
      });

      const res = await del(`/api/interactions/likes/${p.id}`, {
        token: liker.accessToken,
      });

      expect(res.status).toBe(204);
    });

    it("should reject unliking a post not liked (404 NOT_LIKED)", async () => {
      const owner = await createTestUser();
      const user = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      const res = await del(`/api/interactions/likes/${p.id}`, {
        token: user.accessToken,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_LIKED");
    });
  });

  describe("GET /api/interactions/likes/:postId", () => {
    it("should return like count (200)", async () => {
      const owner = await createTestUser();
      const liker = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      await post(`/api/interactions/likes/${p.id}`, {
        token: liker.accessToken,
      });

      const res = await get(`/api/interactions/likes/${p.id}`, {
        token: owner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("likeCount");
      expect(res.body.likeCount).toBeGreaterThanOrEqual(1);
    });

    it("should return 0 likes for a post with no likes (200)", async () => {
      const owner = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      const res = await get(`/api/interactions/likes/${p.id}`, {
        token: owner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.likeCount).toBe(0);
    });
  });

  /** ───── Comments ───── */

  describe("POST /api/interactions/comments/:postId", () => {
    let owner;
    let commenter;
    let postId;

    beforeAll(async () => {
      owner = await createTestUser();
      commenter = await createTestUser();
      const p = await createTestPost(owner.accessToken);
      postId = p.id;
    });

    it("should add a comment (201)", async () => {
      const res = await post(`/api/interactions/comments/${postId}`, {
        token: commenter.accessToken,
        body: { text: "Nice post!" },
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("postId", postId);
      expect(res.body).toHaveProperty("userId", commenter.userId);
      expect(res.body).toHaveProperty("text", "Nice post!");
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should reject empty comment text (400)", async () => {
      const res = await post(`/api/interactions/comments/${postId}`, {
        token: commenter.accessToken,
        body: { text: "" },
      });

      expect(res.status).toBe(400);
      expect(["MISSING_FIELDS", "INVALID_FIELDS"]).toContain(
        res.body.error.code,
      );
    });

    it("should reject missing text field (400 MISSING_FIELDS)", async () => {
      const res = await post(`/api/interactions/comments/${postId}`, {
        token: commenter.accessToken,
        body: {},
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });

    it("should reject comment on non-existent post (404 POST_NOT_FOUND)", async () => {
      const res = await post(
        "/api/interactions/comments/00000000-0000-0000-0000-000000000000",
        {
          token: commenter.accessToken,
          body: { text: "Ghost comment" },
        },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("POST_NOT_FOUND");
    });

    it("should reject comment on private user's post without access (403)", async () => {
      const privateUser = await createTestUser();
      const outsider = await createTestUser();

      await patch("/api/users/me", {
        token: privateUser.accessToken,
        body: { isPrivate: true },
      });

      const p = await createTestPost(privateUser.accessToken, "Private");

      const res = await post(`/api/interactions/comments/${p.id}`, {
        token: outsider.accessToken,
        body: { text: "Should fail" },
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });
  });

  describe("GET /api/interactions/comments/:postId", () => {
    it("should return comments list (200)", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      await post(`/api/interactions/comments/${p.id}`, {
        token: commenter.accessToken,
        body: { text: "Test comment" },
      });

      const res = await get(`/api/interactions/comments/${p.id}`, {
        token: owner.accessToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("comments");
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.comments.length).toBeGreaterThanOrEqual(1);
      expect(res.body).toHaveProperty("totalCount");

      const comment = res.body.comments[0];
      expect(comment).toHaveProperty("id");
      expect(comment).toHaveProperty("userId");
      expect(comment).toHaveProperty("username");
      expect(comment).toHaveProperty("text");
      expect(comment).toHaveProperty("createdAt");
    });
  });

  describe("PUT /api/interactions/comments/:commentId", () => {
    let owner;
    let commenter;
    let commentId;

    beforeAll(async () => {
      owner = await createTestUser();
      commenter = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      const created = await post(`/api/interactions/comments/${p.id}`, {
        token: commenter.accessToken,
        body: { text: "Original text" },
      });
      commentId = created.body.id;
    });

    it("should edit own comment (200)", async () => {
      const res = await put(`/api/interactions/comments/${commentId}`, {
        token: commenter.accessToken,
        body: { text: "Edited text" },
      });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe("Edited text");
    });

    it("should reject editing someone else's comment (403 ACCESS_DENIED)", async () => {
      const res = await put(`/api/interactions/comments/${commentId}`, {
        token: owner.accessToken,
        body: { text: "Hijacked" },
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });

    it("should reject empty text (400)", async () => {
      const res = await put(`/api/interactions/comments/${commentId}`, {
        token: commenter.accessToken,
        body: { text: "" },
      });

      expect(res.status).toBe(400);
      expect(["MISSING_FIELDS", "INVALID_FIELDS"]).toContain(
        res.body.error.code,
      );
    });

    it("should return 404 for non-existent comment (COMMENT_NOT_FOUND)", async () => {
      const res = await put(
        "/api/interactions/comments/00000000-0000-0000-0000-000000000000",
        {
          token: commenter.accessToken,
          body: { text: "Ghost" },
        },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("COMMENT_NOT_FOUND");
    });
  });

  describe("DELETE /api/interactions/comments/:commentId", () => {
    it("should delete own comment (204)", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      const created = await post(`/api/interactions/comments/${p.id}`, {
        token: commenter.accessToken,
        body: { text: "To be deleted" },
      });

      const res = await del(
        `/api/interactions/comments/${created.body.id}`,
        { token: commenter.accessToken },
      );

      expect(res.status).toBe(204);
    });

    it("should reject deleting someone else's comment (403 ACCESS_DENIED)", async () => {
      const owner = await createTestUser();
      const commenter = await createTestUser();
      const p = await createTestPost(owner.accessToken);

      const created = await post(`/api/interactions/comments/${p.id}`, {
        token: commenter.accessToken,
        body: { text: "Not yours to delete" },
      });

      const res = await del(
        `/api/interactions/comments/${created.body.id}`,
        { token: owner.accessToken },
      );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCESS_DENIED");
    });

    it("should return 404 for non-existent comment (COMMENT_NOT_FOUND)", async () => {
      const user = await createTestUser();

      const res = await del(
        "/api/interactions/comments/00000000-0000-0000-0000-000000000000",
        { token: user.accessToken },
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("COMMENT_NOT_FOUND");
    });
  });
});
