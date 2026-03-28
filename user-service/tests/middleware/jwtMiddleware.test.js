import { jest } from "@jest/globals";

// 1. Mock jsonwebtoken
const mockJwt = {
  verify: jest.fn(),
};
await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

// 2. Mock config/env.js
await jest.unstable_mockModule("../../config/env.js", () => ({
  config: {
    jwtPublicKey: "mockPublicKey",
  },
}));

// 3. Mock errorHandler.js
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

// 4. Import the middleware
// (Assuming your test is in tests/middleware/ and the file is in utils/)
const { requireAuth } = await import("../../utils/jwtMiddleware.js");

describe("jwtMiddleware - requireAuth", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {}; // res is not used directly in this middleware
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should call next with AppError if Authorization header is missing", () => {
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].message).toBe(
      "Authorization token is required.",
    );
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_MISSING");
  });

  it("should call next with AppError if token format is invalid (no Bearer)", () => {
    req.headers.authorization = "InvalidFormat token123";
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].message).toBe(
      "Authorization token is required.",
    );
  });

  it("should call next with AppError if token is expired", () => {
    req.headers.authorization = "Bearer expiredtoken";
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    mockJwt.verify.mockImplementation(() => {
      throw expiredError;
    });

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].message).toBe(
      "Authorization token has expired.",
    );
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_EXPIRED");
  });

  it("should call next with AppError if token is invalid", () => {
    req.headers.authorization = "Bearer invalidtoken";
    mockJwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].message).toBe(
      "Authorization token is invalid.",
    );
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].errorCode).toBe("TOKEN_INVALID");
  });

  it("should call next() and set req.userId and req.token if token is valid", () => {
    req.headers.authorization = "Bearer validtoken123";
    mockJwt.verify.mockReturnValue({ userId: "user-123" });

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-123");
    expect(req.token).toBe("validtoken123");
    expect(next).toHaveBeenCalledWith(); // Called with no arguments (success)
  });
});
