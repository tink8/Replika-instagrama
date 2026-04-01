import type { ApiErrorResponse, RefreshResponse } from "../types/api";

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim() || "";
const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data: RefreshResponse = await res.json();
    localStorage.setItem("access_token", data.accessToken);
    return data.accessToken;
  } catch (err) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login"; // Force login if refresh fails
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let token = localStorage.getItem("access_token");

  // We cast options.headers to Record<string, string> to satisfy TypeScript's strict rules
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If sending FormData (e.g., for file uploads), remove Content-Type so the browser sets the boundary automatically
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle Rate Limiting — never treat 429 as an auth error
  if (response.status === 429) {
    throw new ApiError(
      "RATE_LIMITED",
      "Too many requests. Please wait a moment and try again.",
    );
  }

  // Handle Token Expiration
  if (response.status === 401 && endpoint !== "/api/auth/refresh") {
    const errorData = await response
      .clone()
      .json()
      .catch(() => null);
    if (
      errorData?.error?.code === "TOKEN_EXPIRED" ||
      errorData?.error?.code === "TOKEN_INVALID"
    ) {
      token = await refreshAccessToken();
      if (token) {
        // Retry original request with new token
        headers["Authorization"] = `Bearer ${token}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errData = data as ApiErrorResponse;
    throw new ApiError(
      errData.error?.code || "UNKNOWN_ERROR",
      errData.error?.message || "An unexpected error occurred",
    );
  }

  return data as T;
}
