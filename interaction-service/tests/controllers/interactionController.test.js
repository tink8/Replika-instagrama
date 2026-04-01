import { jest } from "@jest/globals";

const mockInteractionModel = {
  findLike: jest.fn(),
  createLike: jest.fn(),
  deleteLike: jest.fn(),
  getLikeCount: jest.fn(),
  createComment: jest.fn(),
  getCommentsByPostId: jest.fn(),
  findCommentById: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
};

const mockPostServiceClient = {
  getPostExists: jest.fn(),
};

const mockSocialServiceClient = {
  checkAccess: jest.fn(),
};

const mockUserServiceClient = {
  getUsersBatch: jest.fn(),
};

await jest.unstable_mockModule("../../models/interactionModel.js", () => ({
  interactionModel: mockInteractionModel,
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

await jest.unstable_mockModule("../../utils/serviceClients.js", () => ({
  postServiceClient: mockPostServiceClient,
  socialServiceClient: mockSocialServiceClient,
  userServiceClient: mockUserServiceClient,
}));

const { interactionController } =
  await import("../../controllers/interactionController.js");

describe("interactionController", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      userId: "user-1",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ─── likePost ──────────────────────────────────────────────────
  describe("likePost", () => {
    it("should like a post when access is allowed", async () => {
      req.params.postId = "post-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockSocialServiceClient.checkAccess.mockResolvedValue({
        hasAccess: true,
      });
      mockInteractionModel.findLike.mockResolvedValue(null);

      await interactionController.likePost(req, res, next);

      expect(mockInteractionModel.createLike).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: "Post liked." });
    });

    it("should skip access check when user is post owner", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.findLike.mockResolvedValue(null);

      await interactionController.likePost(req, res, next);

      expect(mockSocialServiceClient.checkAccess).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should return POST_NOT_FOUND when post does not exist", async () => {
      req.params.postId = "missing";
      mockPostServiceClient.getPostExists.mockResolvedValue(null);

      await interactionController.likePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });

    it("should return ACCESS_DENIED when user cannot access post", async () => {
      req.params.postId = "post-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockSocialServiceClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "private",
      });

      await interactionController.likePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should return ALREADY_LIKED when post is already liked", async () => {
      req.params.postId = "post-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockSocialServiceClient.checkAccess.mockResolvedValue({
        hasAccess: true,
      });
      mockInteractionModel.findLike.mockResolvedValue({ id: "like-1" });

      await interactionController.likePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ALREADY_LIKED");
    });
  });

  // ─── unlikePost ────────────────────────────────────────────────
  describe("unlikePost", () => {
    it("should unlike a post successfully", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.deleteLike.mockResolvedValue(1);

      await interactionController.unlikePost(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should return NOT_LIKED when like does not exist", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.deleteLike.mockResolvedValue(0);

      await interactionController.unlikePost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("NOT_LIKED");
    });
  });

  // ─── getLikeCount ──────────────────────────────────────────────
  describe("getLikeCount", () => {
    it("should return like count for accessible post", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.getLikeCount.mockResolvedValue(7);

      await interactionController.getLikeCount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ postId: "post-1", likeCount: 7 });
    });

    it("should return POST_NOT_FOUND for missing post", async () => {
      req.params.postId = "missing";
      mockPostServiceClient.getPostExists.mockResolvedValue(null);

      await interactionController.getLikeCount(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });
  });

  // ─── addComment ────────────────────────────────────────────────
  describe("addComment", () => {
    it("should add a comment successfully", async () => {
      req.params.postId = "post-1";
      req.body = { text: "Nice post!" };
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });

      await interactionController.addComment(req, res, next);

      expect(mockInteractionModel.createComment).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Nice post!", postId: "post-1" }),
      );
    });

    it("should reject when text field is missing", async () => {
      req.params.postId = "post-1";
      req.body = {};
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });

      await interactionController.addComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should reject empty comment text", async () => {
      req.params.postId = "post-1";
      req.body = { text: "   " };
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });

      await interactionController.addComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("INVALID_FIELDS");
    });

    it("should reject non-string comment text", async () => {
      req.params.postId = "post-1";
      req.body = { text: 12345 };
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });

      await interactionController.addComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("INVALID_FIELDS");
    });
  });

  // ─── getComments ───────────────────────────────────────────────
  describe("getComments", () => {
    it("should return enriched comments with usernames", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.getCommentsByPostId.mockResolvedValue({
        comments: [
          {
            id: "c1",
            postId: "post-1",
            userId: "user-2",
            text: "hi",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
      });
      mockUserServiceClient.getUsersBatch.mockResolvedValue([
        { id: "user-2", username: "mika", avatarUrl: null },
      ]);

      await interactionController.getComments(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        comments: [
          expect.objectContaining({
            id: "c1",
            username: "mika",
            avatarUrl: null,
          }),
        ],
        page: 1,
        totalPages: 1,
        totalCount: 1,
      });
    });

    it("should use 'unknown' username when user not found in batch", async () => {
      req.params.postId = "post-1";
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.getCommentsByPostId.mockResolvedValue({
        comments: [
          {
            id: "c1",
            postId: "post-1",
            userId: "deleted-user",
            text: "hello",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
      });
      mockUserServiceClient.getUsersBatch.mockResolvedValue([]);

      await interactionController.getComments(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          comments: [expect.objectContaining({ username: "unknown" })],
        }),
      );
    });

    it("should handle pagination parameters", async () => {
      req.params.postId = "post-1";
      req.query = { page: "2", limit: "5" };
      req.userId = "owner-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.getCommentsByPostId.mockResolvedValue({
        comments: [],
        total: 10,
      });
      mockUserServiceClient.getUsersBatch.mockResolvedValue([]);

      await interactionController.getComments(req, res, next);

      expect(mockInteractionModel.getCommentsByPostId).toHaveBeenCalledWith(
        "post-1",
        5,
        5,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, totalPages: 2 }),
      );
    });
  });

  // ─── updateComment ─────────────────────────────────────────────
  describe("updateComment", () => {
    it("should update comment successfully", async () => {
      req.params.commentId = "c1";
      req.body = { text: "Updated text" };
      mockInteractionModel.findCommentById
        .mockResolvedValueOnce({
          id: "c1",
          postId: "post-1",
          userId: "user-1",
          text: "old",
          createdAt: "2026-01-01T00:00:00.000Z",
        })
        .mockResolvedValueOnce({
          id: "c1",
          postId: "post-1",
          userId: "user-1",
          text: "Updated text",
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      mockInteractionModel.updateComment.mockResolvedValue(true);

      await interactionController.updateComment(req, res, next);

      expect(mockInteractionModel.updateComment).toHaveBeenCalledWith(
        "c1",
        "Updated text",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Updated text" }),
      );
    });

    it("should return COMMENT_NOT_FOUND for missing comment", async () => {
      req.params.commentId = "missing";
      req.body = { text: "new" };
      mockInteractionModel.findCommentById.mockResolvedValue(null);

      await interactionController.updateComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("COMMENT_NOT_FOUND");
    });

    it("should return ACCESS_DENIED when not the comment owner", async () => {
      req.params.commentId = "c1";
      req.body = { text: "new" };
      mockInteractionModel.findCommentById.mockResolvedValue({
        id: "c1",
        userId: "other-user",
        text: "old",
      });

      await interactionController.updateComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });

    it("should reject when text field is missing", async () => {
      req.params.commentId = "c1";
      req.body = {};

      await interactionController.updateComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });
  });

  // ─── deleteComment ─────────────────────────────────────────────
  describe("deleteComment", () => {
    it("should delete comment successfully", async () => {
      req.params.commentId = "c1";
      mockInteractionModel.findCommentById.mockResolvedValue({
        id: "c1",
        userId: "user-1",
      });
      mockInteractionModel.deleteComment.mockResolvedValue(true);

      await interactionController.deleteComment(req, res, next);

      expect(mockInteractionModel.deleteComment).toHaveBeenCalledWith("c1");
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should return COMMENT_NOT_FOUND for missing comment", async () => {
      req.params.commentId = "missing";
      mockInteractionModel.findCommentById.mockResolvedValue(null);

      await interactionController.deleteComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("COMMENT_NOT_FOUND");
    });

    it("should return ACCESS_DENIED when not the comment owner", async () => {
      req.params.commentId = "c1";
      mockInteractionModel.findCommentById.mockResolvedValue({
        id: "c1",
        userId: "other-user",
      });

      await interactionController.deleteComment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("ACCESS_DENIED");
    });
  });
});
