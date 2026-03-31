import { jest } from "@jest/globals";

const mockPostModel = {
  createPost: jest.fn(),
  findPostById: jest.fn(),
  updatePostDescription: jest.fn(),
  deletePost: jest.fn(),
  findMediaById: jest.fn(),
  deleteMedia: jest.fn(),
  countMediaForPost: jest.fn(),
  getUserPosts: jest.fn(),
};

await jest.unstable_mockModule("../../models/postModel.js", () => ({
  postModel: mockPostModel,
}));

class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}
await jest.unstable_mockModule("../../utils/errorHandler.js", () => ({
  AppError,
}));

const mockMinioClient = {
  putObject: jest.fn(),
  removeObject: jest.fn(),
};
await jest.unstable_mockModule("../../utils/minioClient.js", () => ({
  default: mockMinioClient,
}));

await jest.unstable_mockModule("../../config/env.js", () => ({
  config: {
    minio: {
      bucketName: "posts",
      useSSL: false,
      endPoint: "localhost",
      port: 9000,
    },
  },
}));

const mockSocialClient = {
  checkAccess: jest.fn(),
};
const mockInteractionClient = {
  getCounts: jest.fn(),
  getCountsBatch: jest.fn(),
};
await jest.unstable_mockModule("../../utils/serviceClients.js", () => ({
  socialServiceClient: mockSocialClient,
  interactionServiceClient: mockInteractionClient,
}));

const { postController } = await import("../../controllers/postController.js");

describe("postController", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      userId: "user-1",
      token: "token",
      files: [],
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ─── createPost ────────────────────────────────────────────────
  describe("createPost", () => {
    it("should reject when no media is provided", async () => {
      await postController.createPost(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("NO_MEDIA");
    });

    it("should reject when more than 20 files are provided", async () => {
      req.files = Array.from({ length: 21 }, (_, i) => ({
        originalname: `file${i}.png`,
        buffer: Buffer.from(""),
        size: 100,
        mimetype: "image/png",
      }));

      await postController.createPost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("TOO_MANY_MEDIA");
    });

    it("should create a post with files successfully", async () => {
      req.files = [
        {
          originalname: "photo.jpg",
          buffer: Buffer.from("img-data"),
          size: 500,
          mimetype: "image/jpeg",
        },
      ];
      req.body.description = "My post";

      mockMinioClient.putObject.mockResolvedValue(true);
      mockPostModel.createPost.mockResolvedValue(true);
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-new",
        description: "My post",
        media: [
          {
            id: "m1",
            url: "http://localhost:9000/posts/key.jpg",
            type: "image",
            order: 0,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      await postController.createPost(req, res, next);

      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
      expect(mockPostModel.createPost).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: "post-new", description: "My post" }),
      );
    });

    it("should cleanup uploaded objects on failure", async () => {
      req.files = [
        {
          originalname: "photo.jpg",
          buffer: Buffer.from("img-data"),
          size: 500,
          mimetype: "image/jpeg",
        },
      ];

      mockMinioClient.putObject.mockResolvedValue(true);
      mockPostModel.createPost.mockRejectedValue(new Error("DB error"));
      mockMinioClient.removeObject.mockResolvedValue(true);

      await postController.createPost(req, res, next);

      expect(mockMinioClient.removeObject).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── getPost ───────────────────────────────────────────────────
  describe("getPost", () => {
    it("should return POST_NOT_FOUND when post does not exist", async () => {
      req.params.postId = "missing";
      mockPostModel.findPostById.mockResolvedValue(null);

      await postController.getPost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });

    it("should return post with counts for accessible post", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
        description: "hello",
        createdAt: "2026-01-01T00:00:00.000Z",
        media: [],
      });
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: true,
        reason: "following",
      });
      mockInteractionClient.getCounts.mockResolvedValue({
        postId: "post-1",
        likeCount: 2,
        commentCount: 3,
      });

      await postController.getPost(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "post-1",
          likeCount: 2,
          commentCount: 3,
        }),
      );
    });

    it("should allow owner to access their own post without social check", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "owner-1",
        description: "my post",
        createdAt: "2026-01-01T00:00:00.000Z",
        media: [],
      });
      mockInteractionClient.getCounts.mockResolvedValue({
        likeCount: 0,
        commentCount: 0,
      });

      await postController.getPost(req, res, next);

      expect(mockSocialClient.checkAccess).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return ACCESS_DENIED for private profile post", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "private-user",
        description: "secret",
        createdAt: "2026-01-01T00:00:00.000Z",
        media: [],
      });
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "private_no_follow",
      });

      await postController.getPost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should return POST_NOT_FOUND when blocked", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "blocker",
        description: "x",
        createdAt: "2026-01-01T00:00:00.000Z",
        media: [],
      });
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "blocked_by_target",
      });

      await postController.getPost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });
  });

  // ─── updatePost ────────────────────────────────────────────────
  describe("updatePost", () => {
    it("should update post description successfully", async () => {
      req.params.postId = "post-1";
      req.body = { description: "Updated desc" };
      mockPostModel.findPostById
        .mockResolvedValueOnce({
          id: "post-1",
          userId: "user-1",
          description: "old",
          media: [],
          createdAt: "2026-01-01T00:00:00.000Z",
        })
        .mockResolvedValueOnce({
          id: "post-1",
          userId: "user-1",
          description: "Updated desc",
          media: [],
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      mockPostModel.updatePostDescription.mockResolvedValue(true);
      mockInteractionClient.getCounts.mockResolvedValue({
        likeCount: 0,
        commentCount: 0,
      });

      await postController.updatePost(req, res, next);

      expect(mockPostModel.updatePostDescription).toHaveBeenCalledWith(
        "post-1",
        "Updated desc",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should reject when description field is missing", async () => {
      req.params.postId = "post-1";
      req.body = {};

      await postController.updatePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("NO_FIELDS");
    });

    it("should return POST_NOT_FOUND for non-existent post", async () => {
      req.params.postId = "missing";
      req.body = { description: "new" };
      mockPostModel.findPostById.mockResolvedValue(null);

      await postController.updatePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });

    it("should reject when user is not the owner", async () => {
      req.params.postId = "post-1";
      req.body = { description: "new" };
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "other-user",
        description: "old",
        media: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      });

      await postController.updatePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });
  });

  // ─── deletePost ────────────────────────────────────────────────
  describe("deletePost", () => {
    it("should delete post and its media from storage", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        media: [
          { objectKey: "user-1/img1.jpg" },
          { objectKey: "user-1/img2.jpg" },
        ],
      });
      mockMinioClient.removeObject.mockResolvedValue(true);
      mockPostModel.deletePost.mockResolvedValue(true);

      await postController.deletePost(req, res, next);

      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(2);
      expect(mockPostModel.deletePost).toHaveBeenCalledWith("post-1");
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should return POST_NOT_FOUND for non-existent post", async () => {
      req.params.postId = "missing";
      mockPostModel.findPostById.mockResolvedValue(null);

      await postController.deletePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });

    it("should reject when user is not the owner", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "other-user",
        media: [],
      });

      await postController.deletePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should still delete post even if minio cleanup fails", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        media: [{ objectKey: "user-1/img1.jpg" }],
      });
      mockMinioClient.removeObject.mockRejectedValue(new Error("minio down"));
      mockPostModel.deletePost.mockResolvedValue(true);

      await postController.deletePost(req, res, next);

      expect(mockPostModel.deletePost).toHaveBeenCalledWith("post-1");
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // ─── deleteMedia ───────────────────────────────────────────────
  describe("deleteMedia", () => {
    it("should delete a single media item", async () => {
      req.params = { postId: "post-1", mediaId: "media-1" };
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        media: [],
      });
      mockPostModel.findMediaById.mockResolvedValue({
        id: "media-1",
        objectKey: "user-1/img.jpg",
      });
      mockMinioClient.removeObject.mockResolvedValue(true);
      mockPostModel.deleteMedia.mockResolvedValue(true);
      mockPostModel.countMediaForPost.mockResolvedValue(2);

      await postController.deleteMedia(req, res, next);

      expect(mockPostModel.deleteMedia).toHaveBeenCalledWith("media-1");
      expect(mockPostModel.deletePost).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should delete entire post when last media is removed", async () => {
      req.params = { postId: "post-1", mediaId: "media-1" };
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        media: [],
      });
      mockPostModel.findMediaById.mockResolvedValue({
        id: "media-1",
        objectKey: "user-1/img.jpg",
      });
      mockMinioClient.removeObject.mockResolvedValue(true);
      mockPostModel.deleteMedia.mockResolvedValue(true);
      mockPostModel.countMediaForPost.mockResolvedValue(0);
      mockPostModel.deletePost.mockResolvedValue(true);

      await postController.deleteMedia(req, res, next);

      expect(mockPostModel.deletePost).toHaveBeenCalledWith("post-1");
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should return POST_NOT_FOUND for non-existent post", async () => {
      req.params = { postId: "missing", mediaId: "media-1" };
      mockPostModel.findPostById.mockResolvedValue(null);

      await postController.deleteMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });

    it("should reject when user is not the owner", async () => {
      req.params = { postId: "post-1", mediaId: "media-1" };
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "other-user",
        media: [],
      });

      await postController.deleteMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should return MEDIA_NOT_FOUND when media does not exist", async () => {
      req.params = { postId: "post-1", mediaId: "bad-media" };
      mockPostModel.findPostById.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        media: [],
      });
      mockPostModel.findMediaById.mockResolvedValue(null);

      await postController.deleteMedia(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MEDIA_NOT_FOUND");
    });
  });

  // ─── getUserPosts ──────────────────────────────────────────────
  describe("getUserPosts", () => {
    it("should return paginated posts for accessible user", async () => {
      req.params.userId = "user-2";
      req.query = { page: "1", limit: "10" };
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: true,
        reason: "public",
      });
      mockPostModel.getUserPosts.mockResolvedValue({
        posts: [
          {
            id: "p1",
            description: "Post 1",
            media: [{ id: "m1", url: "u", type: "image", order: 0 }],
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
      });
      mockInteractionClient.getCountsBatch.mockResolvedValue([
        { postId: "p1", likeCount: 5, commentCount: 2 },
      ]);

      await postController.getUserPosts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          posts: [expect.objectContaining({ id: "p1", likeCount: 5 })],
          page: 1,
          totalPages: 1,
        }),
      );
    });

    it("should skip social check for own posts", async () => {
      req.params.userId = "user-1";
      mockPostModel.getUserPosts.mockResolvedValue({ posts: [], total: 0 });
      mockInteractionClient.getCountsBatch.mockResolvedValue([]);

      await postController.getUserPosts(req, res, next);

      expect(mockSocialClient.checkAccess).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return ACCESS_DENIED for private profile", async () => {
      req.params.userId = "private-user";
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "private_no_follow",
      });

      await postController.getUserPosts(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should return USER_NOT_FOUND when blocked", async () => {
      req.params.userId = "blocker-user";
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "blocked_by_target",
      });

      await postController.getUserPosts(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("USER_NOT_FOUND");
    });
  });
});
