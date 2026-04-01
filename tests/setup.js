/**
 * Shared test helpers for integration tests.
 *
 * All requests go through the API Gateway (http://localhost:8000)
 * so we test the full request lifecycle: gateway → service → database.
 */

const BASE_URL = process.env.API_GATEWAY_URL || "http://localhost:8000";

/**
 * Lightweight HTTP helper – wraps fetch() with JSON defaults.
 * Returns { status, body, headers } for easy assertions.
 */
async function request(method, path, { body, token, headers: extra } = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = { ...extra };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, body: data, headers: res.headers };
}

/** Shorthand helpers */
const get = (path, opts) => request("GET", path, opts);
const post = (path, opts) => request("POST", path, opts);
const patch = (path, opts) => request("PATCH", path, opts);
const put = (path, opts) => request("PUT", path, opts);
const del = (path, opts) => request("DELETE", path, opts);

/**
 * Register a brand-new user and return { userId, accessToken, refreshToken, username, email }.
 * Uses a unique suffix to avoid collisions between test runs.
 */
async function createTestUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const name = overrides.name || `Test User ${suffix}`;
  const username = overrides.username || `testuser_${suffix}`;
  const email = overrides.email || `test_${suffix}@example.com`;
  const password = overrides.password || "TestPass123!";

  const reg = await post("/api/auth/register", {
    body: { name, username, email, password },
  });

  if (reg.status !== 201) {
    throw new Error(
      `createTestUser: registration failed (${reg.status}) – ${JSON.stringify(reg.body)}`,
    );
  }

  const login = await post("/api/auth/login", {
    body: { login: username, password },
  });

  if (login.status !== 200) {
    throw new Error(
      `createTestUser: login failed (${login.status}) – ${JSON.stringify(login.body)}`,
    );
  }

  return {
    userId: reg.body.userId,
    accessToken: login.body.accessToken,
    refreshToken: login.body.refreshToken,
    username,
    email,
    password,
  };
}

export { BASE_URL, request, get, post, patch, put, del, createTestUser };
