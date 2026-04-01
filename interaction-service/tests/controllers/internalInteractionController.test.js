import { jest } from "@jest/globals";

const mockInteractionModel = {
  getCountsForPost: jest.fn(),
  getCountsForPostIds: jest.fn(),
  purgeBetweenUsers: jest.fn(),
};

const mockPostServiceClient = {
  getPostExists: jest.fn(),
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
}));

const { internalInteractionController } =
  await import("../../controllers/internalInteractionController.js");

describe("internalInteractionController", () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ─── getCountsForPost ─────────────────────────────────────────
  describe("getCountsForPost", () => {
    it("should return counts for an existing post", async () => {
      req.params.postId = "post-1";
      mockPostServiceClient.getPostExists.mockResolvedValue({
        exists: true,
        ownerId: "owner-1",
      });
      mockInteractionModel.getCountsForPost.mockResolvedValue({
        likeCount: 4,
        commentCount: 2,
      });

      await internalInteractionController.getCountsForPost(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        postId: "post-1",
        likeCount: 4,
        commentCount: 2,
      });
    });

    it("should return POST_NOT_FOUND for non-existent post", async () => {
      req.params.postId = "missing";
      mockPostServiceClient.getPostExists.mockResolvedValue(null);

      await internalInteractionController.getCountsForPost(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });
  });

  // ─── getBatchCounts ────────────────────────────────────────────
  describe("getBatchCounts", () => {
    it("should return batch counts for multiple posts", async () => {
      req.query = { postIds: "p1,p2", userId: "user-1" };
      mockInteractionModel.getCountsForPostIds.mockResolvedValue([
        { postId: "p1", likeCount: 3, commentCount: 1 },
        { postId: "p2", likeCount: 0, commentCount: 5 },
      ]);

      await internalInteractionController.getBatchCounts(req, res, next);

      expect(mockInteractionModel.getCountsForPostIds).toHaveBeenCalledWith(
        ["p1", "p2"],
        "user-1",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        counts: [
          { postId: "p1", likeCount: 3, commentCount: 1 },
          { postId: "p2", likeCount: 0, commentCount: 5 },
        ],
      });
    });

    it("should require postIds query parameter", async () => {
      req.query = {};

      await internalInteractionController.getBatchCounts(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should reject empty postIds after trimming", async () => {
      req.query = { postIds: " , , " };

      await internalInteractionController.getBatchCounts(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should pass null userId when not provided", async () => {
      req.query = { postIds: "p1" };
      mockInteractionModel.getCountsForPostIds.mockResolvedValue([]);

      await internalInteractionController.getBatchCounts(req, res, next);

      expect(mockInteractionModel.getCountsForPostIds).toHaveBeenCalledWith(
        ["p1"],
        null,
      );
    });
  });

  // ─── purgeInteractions ─────────────────────────────────────────
  describe("purgeInteractions", () => {
    it("should purge interactions between two users", async () => {
      req.query = { userA: "u1", userB: "u2" };
      mockInteractionModel.purgeBetweenUsers.mockResolvedValue(true);

      await internalInteractionController.purgeInteractions(req, res, next);

      expect(mockInteractionModel.purgeBetweenUsers).toHaveBeenCalledWith(
        "u1",
        "u2",
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should require both userA and userB", async () => {
      req.query = { userA: "u1" };

      await internalInteractionController.purgeInteractions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should reject when both parameters are missing", async () => {
      req.query = {};

      await internalInteractionController.purgeInteractions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
