const jwt = require("jsonwebtoken");
const fs = require("fs");

// Mock fs before requiring the auth middleware so it reads our fake key
jest.mock("fs");
fs.readFileSync.mockReturnValue("fake-public-key");

const requireAuth = require("../middleware/auth");
const ApiError = require("../utils/ApiError");

describe("Auth Middleware (Zero Trust)", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
  });

  it("should throw 401 if no authorization header is present", () => {
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].code).toBe("UNAUTHORIZED");
  });

  it("should throw 401 if token is invalid", () => {
    req.headers.authorization = "Bearer invalidtoken";
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid token");
    });

    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it("should call next() and attach user if token is valid", () => {
    req.headers.authorization = "Bearer validtoken";
    jest.spyOn(jwt, "verify").mockReturnValue({ userId: "user-123" });

    requireAuth(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe("user-123");
    expect(next).toHaveBeenCalledWith(); // Called without errors
  });
});
