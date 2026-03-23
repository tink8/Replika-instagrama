import { jest } from "@jest/globals";

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

const jwt = (await import("jsonwebtoken")).default;
const { generateAccessToken, generateRefreshToken, verifyToken } =
  await import("../../utils/jwtUtils.js");

describe("jwtUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate an access token", () => {
    jwt.sign.mockReturnValue("fake-access-token");
    const token = generateAccessToken("user-123", "testuser");

    expect(token).toBe("fake-access-token");
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: "user-123", username: "testuser" },
      expect.anything(),
      { algorithm: "RS256", expiresIn: "15m" },
    );
  });

  it("should generate a refresh token", () => {
    jwt.sign.mockReturnValue("fake-refresh-token");
    const token = generateRefreshToken("user-123");

    expect(token).toBe("fake-refresh-token");
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: "user-123" },
      expect.anything(),
      { algorithm: "RS256", expiresIn: "7d" },
    );
  });

  it("should verify a token", () => {
    jwt.verify.mockReturnValue({ userId: "user-123" });
    const decoded = verifyToken("fake-token");

    expect(decoded).toEqual({ userId: "user-123" });
    expect(jwt.verify).toHaveBeenCalledWith("fake-token", expect.anything(), {
      algorithms: ["RS256"],
    });
  });
});
