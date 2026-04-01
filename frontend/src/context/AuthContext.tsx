import React, { createContext, useContext, useState, useEffect } from "react";
import type { CurrentUser, LoginResponse } from "../types/api";
import { apiClient, ApiError } from "../utils/apiClient";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<void>;
  register: (
    userData: {
      name: string;
      username: string;
      email: string;
      password: string;
    },
    isPrivate: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const userData = await apiClient<CurrentUser>("/api/users/me");
      setUser(userData);
    } catch (error) {
      // Only clear session on real auth errors (401 / token invalid).
      // Transient errors (429 rate-limit, 500, network) should NOT log the user out.
      const isAuthError =
        error instanceof ApiError &&
        (error.code === "TOKEN_EXPIRED" ||
          error.code === "TOKEN_INVALID" ||
          error.code === "UNAUTHORIZED");

      if (isAuthError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      }
      // For non-auth errors: keep current user state, silently ignore
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: { login: string; password: string }) => {
    const data = await apiClient<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);

    const userData = await apiClient<CurrentUser>("/api/users/me");
    setUser(userData);
  };

  const register = async (
    userData: {
      name: string;
      username: string;
      email: string;
      password: string;
    },
    isPrivate: boolean,
  ) => {
    await apiClient("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    await login({ login: userData.username, password: userData.password });

    if (isPrivate) {
      const updatedUser = await apiClient<CurrentUser>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ isPrivate: true }),
      });
      setUser(updatedUser);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await apiClient("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error("Logout API failed, clearing local state anyway", error);
      }
    }
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        checkAuth,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
