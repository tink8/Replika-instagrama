import { jest } from "@jest/globals";

const mockJwt = {
  verify: jest.fn(),
};
await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

await jest.unstable_mockModule("../../config/env.js", () => ({
  config: {
    jwtPublicKey: "mockPublicKey",
  },
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

const { requireAuth } = await import("../../utils/jwtMiddleware.js");

describe("interaction-service jwtMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should set req.userId for a valid user token", () => {
    req.headers.authorization = "Bearer validtoken";
    mockJwt.verify.mockReturnValue({ userId: "user-1" });

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-1");
    expect(req.token).toBe("validtoken");
    expect(next).toHaveBeenCalledWith();
  });

  it("should return TOKEN_MISSING when no authorization header", () => {
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_MISSING");
  });

  it("should return TOKEN_INVALID for non-Bearer token", () => {
    req.headers.authorization = "Basic abc123";

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_INVALID");
  });

  it("should return TOKEN_INVALID for Bearer with empty token", () => {
    req.headers.authorization = "Bearer ";

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_INVALID");
  });

  it("should return TOKEN_EXPIRED for expired token", () => {
    req.headers.authorization = "Bearer expiredtoken";
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    mockJwt.verify.mockImplementation(() => {
      throw expiredError;
    });

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_EXPIRED");
  });

  it("should return TOKEN_INVALID for malformed token", () => {
    req.headers.authorization = "Bearer badtoken";
    mockJwt.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_INVALID");
  });
});
