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
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("sets req.userId for a valid user token", () => {
    req.headers.authorization = "Bearer validtoken";
    mockJwt.verify.mockReturnValue({ userId: "user-1" });

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-1");
    expect(req.token).toBe("validtoken");
    expect(next).toHaveBeenCalledWith();
  });
});
