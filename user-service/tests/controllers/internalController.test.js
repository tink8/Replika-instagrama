import { jest } from "@jest/globals";

const mockUserModel = {
  findUserByUsername: jest.fn(),
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserById: jest.fn(),
  getUsersBatch: jest.fn(),
};

await jest.unstable_mockModule("../../models/userModel.js", () => ({
  userModel: mockUserModel,
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

const { internalController } =
  await import("../../controllers/internalController.js");

describe("internalController", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("createUserProfile", () => {
    it("should create user successfully", async () => {
      req.body = {
        id: "123",
        name: "Test",
        username: "test",
        email: "test@test.com",
      };
      mockUserModel.findUserByUsername.mockResolvedValue(null);
      mockUserModel.findUserByEmail.mockResolvedValue(null);
      mockUserModel.createUser.mockResolvedValue(true);

      await internalController.createUserProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User profile created successfully.",
      });
    });

    it("should call next with AppError if missing fields", async () => {
      req.body = { id: "123" }; // Missing other fields
      await internalController.createUserProfile(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("getUserByUsername", () => {
    it("should return user", async () => {
      req.params.username = "test";
      mockUserModel.findUserByUsername.mockResolvedValue({
        id: "123",
        email: "test@test.com",
        username: "test",
      });

      await internalController.getUserByUsername(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "123",
        email: "test@test.com",
        username: "test",
      });
    });
  });

  describe("getUserByEmail", () => {
    it("should return user", async () => {
      req.params.email = "test@test.com";
      mockUserModel.findUserByEmail.mockResolvedValue({
        id: "123",
        email: "test@test.com",
        username: "test",
      });

      await internalController.getUserByEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getUsersBatch", () => {
    it("should return batch of users", async () => {
      req.body.userIds = ["123", "456"];
      mockUserModel.getUsersBatch.mockResolvedValue([
        { id: "123" },
        { id: "456" },
      ]);

      await internalController.getUsersBatch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: [{ id: "123" }, { id: "456" }],
      });
    });
  });

  describe("getUserById", () => {
    it("should return user basics", async () => {
      req.params.userId = "abc-123";
      mockUserModel.findUserById.mockResolvedValue({
        id: "abc-123",
        name: "Ana",
        username: "ana",
        avatarUrl: null,
        isPrivate: 1,
      });

      await internalController.getUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "abc-123",
        name: "Ana",
        username: "ana",
        avatarUrl: null,
        isPrivate: true,
      });
    });
  });
});
