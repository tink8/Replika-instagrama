import { jest } from "@jest/globals";

// Mock the dependencies
jest.unstable_mockModule("../../models/userModel.js", () => ({
  findUserByEmailOrUsername: jest.fn(),
  createUser: jest.fn(),
  saveRefreshToken: jest.fn(),
  findUserById: jest.fn(),
  findRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

jest.unstable_mockModule("../../utils/hashUtils.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.unstable_mockModule("../../utils/jwtUtils.js", () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

const { register, login, refreshToken, logout } =
  await import("../../controllers/authController.js");
const userModel = await import("../../models/userModel.js");
const hashUtils = await import("../../utils/hashUtils.js");
const jwtUtils = await import("../../utils/jwtUtils.js");

describe("authController", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should return 400 if missing fields", async () => {
      await register(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: "Email, username, and password are required" },
      });
    });

    it("should return 409 if user already exists", async () => {
      req.body = {
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        email: "test@test.com",
      });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: "Email is already in use" },
      });
    });

    it("should register a new user successfully", async () => {
      req.body = {
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      };
      userModel.findUserByEmailOrUsername.mockResolvedValue(null);
      hashUtils.hashPassword.mockResolvedValue("hashedPassword");
      userModel.createUser.mockResolvedValue(true);

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User registered successfully",
        }),
      );
      expect(userModel.createUser).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should return 400 if missing fields", async () => {
      await login(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 401 if user not found", async () => {
      req.body = { identifier: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue(null);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: { message: "Invalid credentials" },
      });
    });

    it("should return 401 if password does not match", async () => {
      req.body = { identifier: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        password_hash: "hash",
      });
      hashUtils.comparePassword.mockResolvedValue(false);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should login successfully and return tokens", async () => {
      req.body = { identifier: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        id: "123",
        username: "testuser",
        email: "test@test.com",
        password_hash: "hash",
      });
      hashUtils.comparePassword.mockResolvedValue(true);
      jwtUtils.generateAccessToken.mockReturnValue("access-token");
      jwtUtils.generateRefreshToken.mockReturnValue("refresh-token");
      userModel.saveRefreshToken.mockResolvedValue(true);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Login successful",
          accessToken: "access-token",
          refreshToken: "refresh-token",
        }),
      );
    });
  });

  describe("refreshToken", () => {
    it("should return 400 if no token provided", async () => {
      await refreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 401 if token not in db", async () => {
      req.body = { refreshToken: "invalid-token" };
      userModel.findRefreshToken.mockResolvedValue(null);

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 401 if token is expired", async () => {
      req.body = { refreshToken: "expired-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() - 10000),
      });
      userModel.deleteRefreshToken.mockResolvedValue(true);

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(userModel.deleteRefreshToken).toHaveBeenCalledWith(
        "expired-token",
      );
    });

    it("should return 401 if token signature is invalid", async () => {
      req.body = { refreshToken: "bad-sig-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() + 10000),
      });
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 401 if user no longer exists", async () => {
      req.body = { refreshToken: "valid-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() + 10000),
      });
      jwtUtils.verifyToken.mockReturnValue({ userId: "123" });
      userModel.findUserById.mockResolvedValue(null);

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should refresh token successfully", async () => {
      req.body = { refreshToken: "valid-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() + 10000),
      });
      jwtUtils.verifyToken.mockReturnValue({ userId: "123" });
      userModel.findUserById.mockResolvedValue({
        id: "123",
        username: "testuser",
      });
      jwtUtils.generateAccessToken.mockReturnValue("new-access-token");

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "new-access-token",
        }),
      );
    });
  });

  describe("logout", () => {
    it("should return 400 if no token provided", async () => {
      await logout(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should delete token and return 200", async () => {
      req.body = { refreshToken: "valid-token" };
      userModel.deleteRefreshToken.mockResolvedValue(true);

      await logout(req, res, next);

      expect(userModel.deleteRefreshToken).toHaveBeenCalledWith("valid-token");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logged out successfully",
      });
    });
  });
});
