jest.mock("../utils/jwt", () => ({
  verifyJwt: jest.fn()
}));

const { verifyJwt } = require("../utils/jwt");
const {
  requireAuth
} = require("./auth.middleware");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

describe("auth.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requireAuth rejects missing token", () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "TOKEN_MISSING",
        message: "Authorization token is required."
      }
    });
  });

  test("requireAuth rejects malformed token", () => {
    const req = { headers: { authorization: "Token abc" } };
    const res = createResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "TOKEN_MALFORMED",
        message: "Authorization token is malformed."
      }
    });
  });

  test("requireAuth rejects expired token", () => {
    verifyJwt.mockImplementation(() => {
      const error = new Error("expired");
      error.name = "TokenExpiredError";
      throw error;
    });

    const req = { headers: { authorization: "Bearer abc" } };
    const res = createResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Authorization token has expired."
      }
    });
  });

  test("requireAuth accepts valid user token", () => {
    verifyJwt.mockReturnValue({ userId: "user-1" });

    const req = { headers: { authorization: "Bearer abc" } };
    const res = createResponse();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.userId).toBe("user-1");
    expect(next).toHaveBeenCalled();
  });
});

