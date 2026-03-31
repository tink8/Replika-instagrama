import { jest } from "@jest/globals";

await jest.unstable_mockModule("../../models/userModel.js", () => ({
  findUserByEmailOrUsername: jest.fn(),
  createUser: jest.fn(),
  saveRefreshToken: jest.fn(),
  findUserById: jest.fn(),
  findRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
}));

await jest.unstable_mockModule("../../utils/hashUtils.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

await jest.unstable_mockModule("../../utils/jwtUtils.js", () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

await jest.unstable_mockModule("axios", () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const authControllerImport =
  await import("../../controllers/authController.js");
const { register, login, refreshToken, logout } =
  authControllerImport.default || authControllerImport;
const userModel = await import("../../models/userModel.js");
const hashUtils = await import("../../utils/hashUtils.js");
const jwtUtils = await import("../../utils/jwtUtils.js");
const axios = (await import("axios")).default;

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
    it("should return MISSING_FIELDS if required data is missing", async () => {
      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: "MISSING_FIELDS",
          message: "Fields name, username, email, and password are required.",
        }),
      );
    });

    it("should return EMAIL_TAKEN if email already exists", async () => {
      req.body = {
        name: "Test User",
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        email: "test@test.com",
      });

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          errorCode: "EMAIL_TAKEN",
          message: "This email is already registered.",
        }),
      );
    });

    it("should register a new user successfully", async () => {
      req.body = {
        name: "Test User",
        email: "test@test.com",
        username: "testuser",
        password: "password123",
      };
      userModel.findUserByEmailOrUsername.mockResolvedValue(null);
      hashUtils.hashPassword.mockResolvedValue("hashedPassword");
      axios.post.mockResolvedValue({ data: {} });
      userModel.createUser.mockResolvedValue(true);

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User registered successfully.",
          userId: expect.any(String),
        }),
      );
      expect(userModel.createUser).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should return MISSING_FIELDS if credentials are missing", async () => {
      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: "MISSING_FIELDS",
          message: "Fields login and password are required.",
        }),
      );
    });

    it("should return INVALID_CREDENTIALS if user is not found", async () => {
      req.body = { login: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue(null);

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: "INVALID_CREDENTIALS",
          message: "Invalid username/email or password.",
        }),
      );
    });

    it("should return INVALID_CREDENTIALS if password does not match", async () => {
      req.body = { login: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        password_hash: "hash",
      });
      hashUtils.comparePassword.mockResolvedValue(false);

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: "INVALID_CREDENTIALS",
          message: "Invalid username/email or password.",
        }),
      );
    });

    it("should login successfully and return tokens", async () => {
      req.body = { login: "testuser", password: "password123" };
      userModel.findUserByEmailOrUsername.mockResolvedValue({
        id: "123",
        username: "testuser",
        email: "test@test.com",
        password_hash: "hash",
      });
      hashUtils.comparePassword.mockResolvedValue(true);
      axios.get.mockResolvedValue({ data: {} });
      jwtUtils.generateAccessToken.mockReturnValue("access-token");
      jwtUtils.generateRefreshToken.mockReturnValue("refresh-token");
      userModel.saveRefreshToken.mockResolvedValue(true);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    it("should return MISSING_FIELDS if no token is provided", async () => {
      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: "MISSING_FIELDS",
          message: "Refresh token is required.",
        }),
      );
    });

    it("should return INVALID_TOKEN if token is not in db", async () => {
      req.body = { refreshToken: "invalid-token" };
      userModel.findRefreshToken.mockResolvedValue(null);

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: "INVALID_TOKEN",
          message: "Refresh token is invalid or expired.",
        }),
      );
    });

    it("should return INVALID_TOKEN if token is expired", async () => {
      req.body = { refreshToken: "expired-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() - 10000),
      });
      userModel.deleteRefreshToken.mockResolvedValue({ affectedRows: 1 });

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: "INVALID_TOKEN",
          message: "Refresh token is invalid or expired.",
        }),
      );
      expect(userModel.deleteRefreshToken).toHaveBeenCalledWith(
        "expired-token",
      );
    });

    it("should return INVALID_TOKEN if signature is invalid", async () => {
      req.body = { refreshToken: "invalid-signature-token" };
      userModel.findRefreshToken.mockResolvedValue({
        expires_at: new Date(Date.now() + 10000),
      });
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          errorCode: "INVALID_TOKEN",
          message: "Refresh token is invalid or expired.",
        }),
      );
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
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "new-access-token",
      });
    });
  });

  describe("logout", () => {
    it("should return MISSING_FIELDS if no token is provided", async () => {
      await logout(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: "MISSING_FIELDS",
          message: "Refresh token is required.",
        }),
      );
    });

    it("should logout successfully", async () => {
      req.body = { refreshToken: "valid-token" };
      userModel.deleteRefreshToken.mockResolvedValue({ affectedRows: 1 });

      await logout(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logged out successfully.",
      });
      expect(userModel.deleteRefreshToken).toHaveBeenCalledWith("valid-token");
    });
  });
});
