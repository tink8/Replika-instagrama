import { jest } from "@jest/globals";

// 1. Mock userModel
const mockUserModel = {
  findUserById: jest.fn(),
  findUserByUsername: jest.fn(),
  updateUserProfile: jest.fn(),
  updateUserAvatar: jest.fn(),
  removeUserAvatar: jest.fn(),
  searchUsers: jest.fn(),
};
await jest.unstable_mockModule("../../models/userModel.js", () => ({
  userModel: mockUserModel,
}));

// 2. Mock AppError
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

// 3. Mock minioClient
const mockMinioClient = {
  putObject: jest.fn(),
  removeObject: jest.fn(),
};
await jest.unstable_mockModule("../../utils/minioClient.js", () => ({
  default: mockMinioClient,
}));

// 4. Mock config
await jest.unstable_mockModule("../../config/env.js", () => ({
  config: {
    minio: {
      bucketName: "test-bucket",
      useSSL: false,
      endPoint: "localhost",
      port: 9000,
    },
  },
}));

// 5. Mock service clients
const mockSocialClient = {
  checkAccess: jest.fn(),
  getCounts: jest.fn(),
  getFollowStatus: jest.fn(),
};
const mockPostClient = {
  getUserPosts: jest.fn(),
  getUserPostCount: jest.fn(),
};
await jest.unstable_mockModule("../../utils/serviceClients.js", () => ({
  socialServiceClient: mockSocialClient,
  postServiceClient: mockPostClient,
}));

// Import the controller AFTER mocking
const { userController } = await import("../../controllers/userController.js");

describe("userController", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      userId: "user123",
      token: "mockToken",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getMe", () => {
    it("should return user profile", async () => {
      mockUserModel.findUserById.mockResolvedValue({
        id: "user123",
        name: "Test",
        username: "test",
        isPrivate: false,
      });
      await userController.getMe(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user123" }),
      );
    });

    it("should call next with AppError if user not found", async () => {
      mockUserModel.findUserById.mockResolvedValue(null);
      await userController.getMe(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("updateMe", () => {
    it("should update user profile", async () => {
      req.body = { bio: "New bio" };
      mockUserModel.updateUserProfile.mockResolvedValue(true);
      mockUserModel.findUserById.mockResolvedValue({
        id: "user123",
        bio: "New bio",
      });

      await userController.updateMe(req, res, next);

      expect(mockUserModel.updateUserProfile).toHaveBeenCalledWith("user123", {
        name: undefined,
        username: undefined,
        bio: "New bio",
        isPrivate: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should call next with AppError if no fields provided", async () => {
      req.body = {};
      await userController.updateMe(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("uploadAvatar", () => {
    it("should upload avatar and return url", async () => {
      req.file = {
        originalname: "pic.png",
        buffer: Buffer.from(""),
        size: 100,
        mimetype: "image/png",
      };
      mockMinioClient.putObject.mockResolvedValue(true);
      mockUserModel.updateUserAvatar.mockResolvedValue(true);

      await userController.uploadAvatar(req, res, next);

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: expect.any(String) }),
      );
    });

    it("should call next with AppError if no file", async () => {
      await userController.uploadAvatar(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("deleteAvatar", () => {
    it("should delete avatar", async () => {
      mockUserModel.findUserById.mockResolvedValue({
        avatarUrl: "http://localhost:9000/test-bucket/123-123.png",
      });
      mockMinioClient.removeObject.mockResolvedValue(true);
      mockUserModel.removeUserAvatar.mockResolvedValue(true);

      await userController.deleteAvatar(req, res, next);

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        "test-bucket",
        "123-123.png",
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe("searchUsers", () => {
    it("should search and filter blocked users", async () => {
      req.query = { q: "test" };
      mockUserModel.searchUsers.mockResolvedValue({
        users: [{ id: "user123" }, { id: "user456" }, { id: "user789" }],
        total: 3,
      });

      // user456 is blocked, user789 is fine
      mockSocialClient.checkAccess.mockImplementation(async (id) => {
        if (id === "user456") return { reason: "blocked_by_target" };
        return { reason: "granted" };
      });

      await userController.searchUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          users: [{ id: "user123" }, { id: "user789" }], // user456 filtered out
        }),
      );
    });
  });

  describe("getUserProfile", () => {
    it("should return profile with social data", async () => {
      req.params = { userId: "user456" };
      mockUserModel.findUserById.mockResolvedValue({
        id: "user456",
        name: "Test",
      });
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: true,
        reason: "granted",
      });
      mockSocialClient.getCounts.mockResolvedValue({
        followerCount: 10,
        followingCount: 5,
      });
      mockSocialClient.getFollowStatus.mockResolvedValue("following");
      mockPostClient.getUserPosts.mockResolvedValue([{ id: "post1" }]);
      mockPostClient.getUserPostCount.mockResolvedValue(1);

      await userController.getUserProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user456",
          followerCount: 10,
          postCount: 1,
          posts: [{ id: "post1" }],
        }),
      );
    });

    it("should call next with AppError if blocked", async () => {
      req.params = { userId: "user456" };
      mockUserModel.findUserById.mockResolvedValue({ id: "user456" });
      mockSocialClient.checkAccess.mockResolvedValue({
        hasAccess: false,
        reason: "blocked_by_target",
      });

      await userController.getUserProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
