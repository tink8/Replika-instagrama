import { describe, it, expect, beforeAll } from "@jest/globals";
import { get, post, createTestUser } from "./setup.js";

describe("Auth Service", () => {
  /** ───── POST /api/auth/register ───── */

  describe("POST /api/auth/register", () => {
    it("should register a new user (201)", async () => {
      const suffix = Date.now();
      const res = await post("/api/auth/register", {
        body: {
          name: `New User ${suffix}`,
          username: `newuser_${suffix}`,
          email: `new_${suffix}@example.com`,
          password: "StrongPass1!",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("userId");
      expect(res.body.message).toBe("User registered successfully.");
    });

    it("should reject duplicate username (409 USERNAME_TAKEN)", async () => {
      const user = await createTestUser();

      const res = await post("/api/auth/register", {
        body: {
          name: "Another Name",
          username: user.username,
          email: "unique_dup_test@example.com",
          password: "StrongPass1!",
        },
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("USERNAME_TAKEN");
    });

    it("should reject duplicate email (409 EMAIL_TAKEN)", async () => {
      const user = await createTestUser();

      const res = await post("/api/auth/register", {
        body: {
          name: "Another Name",
          username: `unique_email_test_${Date.now()}`,
          email: user.email,
          password: "StrongPass1!",
        },
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_TAKEN");
    });

    it("should reject missing required fields (400 MISSING_FIELDS)", async () => {
      const res = await post("/api/auth/register", {
        body: { name: "No Username" },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });

    it("should reject weak password (400 WEAK_PASSWORD)", async () => {
      const res = await post("/api/auth/register", {
        body: {
          name: "Weak",
          username: `weak_${Date.now()}`,
          email: `weak_${Date.now()}@example.com`,
          password: "123",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("WEAK_PASSWORD");
    });

    it("should reject invalid email format (400 INVALID_EMAIL)", async () => {
      const res = await post("/api/auth/register", {
        body: {
          name: "Bad Email",
          username: `bademail_${Date.now()}`,
          email: "not-an-email",
          password: "StrongPass1!",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_EMAIL");
    });
  });

  /** ───── POST /api/auth/login ───── */

  describe("POST /api/auth/login", () => {
    // Register a user WITHOUT logging in, so login tests get a fresh session
    let username;
    let email;
    const password = "LoginTestPass1!";

    beforeAll(async () => {
      const suffix = Math.random().toString(36).slice(2, 10);
      username = `logintest_${suffix}`;
      email = `logintest_${suffix}@example.com`;

      const reg = await post("/api/auth/register", {
        body: { name: "Login Tester", username, email, password },
      });
      expect(reg.status).toBe(201);
    });

    it("should login with valid credentials (200)", async () => {
      const res = await post("/api/auth/login", {
        body: { login: username, password },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });

    it("should login with email instead of username (200)", async () => {
      // Use a separate user to avoid duplicate refresh token collision
      const suffix = Math.random().toString(36).slice(2, 10);
      const emailUser = `emaillogin_${suffix}`;
      const emailAddr = `emaillogin_${suffix}@example.com`;

      await post("/api/auth/register", {
        body: { name: "Email Tester", username: emailUser, email: emailAddr, password },
      });

      const res = await post("/api/auth/login", {
        body: { login: emailAddr, password },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
    });

    it("should reject wrong password (401 INVALID_CREDENTIALS)", async () => {
      const res = await post("/api/auth/login", {
        body: { login: username, password: "WrongPassword!" },
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject non-existent user (401 INVALID_CREDENTIALS)", async () => {
      const res = await post("/api/auth/login", {
        body: { login: "nonexistent_user_xyz", password: "Whatever1!" },
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should reject missing fields (400 MISSING_FIELDS)", async () => {
      const res = await post("/api/auth/login", {
        body: { login: username },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });
  });

  /** ───── POST /api/auth/logout ───── */

  describe("POST /api/auth/logout", () => {
    it("should logout with valid refresh token (200)", async () => {
      const user = await createTestUser();

      const res = await post("/api/auth/logout", {
        body: { refreshToken: user.refreshToken },
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully.");
    });

    it("should reject missing refresh token (400 MISSING_FIELDS)", async () => {
      const res = await post("/api/auth/logout", {
        body: {},
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });

    it("should reject invalid refresh token (401 INVALID_TOKEN)", async () => {
      const res = await post("/api/auth/logout", {
        body: { refreshToken: "completely.invalid.token" },
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  /** ───── POST /api/auth/refresh ───── */

  describe("POST /api/auth/refresh", () => {
    it("should issue new access token with valid refresh token (200)", async () => {
      const user = await createTestUser();

      const res = await post("/api/auth/refresh", {
        body: { refreshToken: user.refreshToken },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(typeof res.body.accessToken).toBe("string");
    });

    it("should reject missing refresh token (400 MISSING_FIELDS)", async () => {
      const res = await post("/api/auth/refresh", {
        body: {},
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });

    it("should reject invalid refresh token (401 INVALID_TOKEN)", async () => {
      const res = await post("/api/auth/refresh", {
        body: { refreshToken: "garbage.token.value" },
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("should reject a revoked/logged-out refresh token (401 TOKEN_REVOKED)", async () => {
      const user = await createTestUser();

      // Logout first to revoke the token
      await post("/api/auth/logout", {
        body: { refreshToken: user.refreshToken },
      });

      // Now try to refresh with the revoked token
      const res = await post("/api/auth/refresh", {
        body: { refreshToken: user.refreshToken },
      });

      expect(res.status).toBe(401);
      // Backend may return INVALID_TOKEN or TOKEN_REVOKED for revoked tokens
      expect(["TOKEN_REVOKED", "INVALID_TOKEN"]).toContain(res.body.error.code);
    });
  });

  /** ───── Gateway-level token validation ───── */

  describe("Gateway token validation", () => {
    it("should reject requests without token (401 TOKEN_MISSING)", async () => {
      const res = await get("/api/users/me");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("TOKEN_MISSING");
    });

    it("should reject malformed token (401 TOKEN_MALFORMED)", async () => {
      const res = await get("/api/users/me", { token: "not-a-jwt" });

      expect(res.status).toBe(401);
      expect(["TOKEN_MALFORMED", "TOKEN_INVALID"]).toContain(res.body.error.code);
    });

    it("should return 404 for unknown routes (ROUTE_NOT_FOUND)", async () => {
      const res = await get("/api/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });
});
