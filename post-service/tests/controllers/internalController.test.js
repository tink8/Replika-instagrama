import { jest } from "@jest/globals";

const mockPostModel = {
  getPostsByUserIds: jest.fn(),
  findPostOwner: jest.fn(),
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

const { internalPostController } =
  await import("../../controllers/internalPostController.js");

describe("internalPostController", () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getPostsByUsers", () => {
    it("should require userIds query parameter", async () => {
      await internalPostController.getPostsByUsers(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should reject empty userIds after trimming", async () => {
      req.query = { userIds: " , , " };
      await internalPostController.getPostsByUsers(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("MISSING_FIELDS");
    });

    it("should return posts by user ids", async () => {
      req.query = { userIds: "u1,u2" };
      mockPostModel.getPostsByUserIds.mockResolvedValue({
        posts: [
          {
            id: "p1",
            userId: "u1",
            description: null,
            media: [],
            createdAt: "x",
          },
        ],
        total: 1,
      });

      await internalPostController.getPostsByUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          posts: [expect.objectContaining({ id: "p1" })],
          page: 1,
          totalPages: 1,
        }),
      );
    });

    it("should handle pagination parameters", async () => {
      req.query = { userIds: "u1", page: "2", limit: "5" };
      mockPostModel.getPostsByUserIds.mockResolvedValue({
        posts: [],
        total: 10,
      });

      await internalPostController.getPostsByUsers(req, res, next);

      expect(mockPostModel.getPostsByUserIds).toHaveBeenCalledWith(
        ["u1"],
        5,
        5,
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, totalPages: 2 }),
      );
    });
  });

  describe("postExists", () => {
    it("should return exists payload for existing post", async () => {
      req.params.postId = "post-1";
      mockPostModel.findPostOwner.mockResolvedValue({ userId: "owner-1" });

      await internalPostController.postExists(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        exists: true,
        ownerId: "owner-1",
      });
    });

    it("should return POST_NOT_FOUND for non-existent post", async () => {
      req.params.postId = "missing";
      mockPostModel.findPostOwner.mockResolvedValue(null);

      await internalPostController.postExists(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].errorCode).toBe("POST_NOT_FOUND");
    });
  });
});
