import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, LoginResponse } from "../types/api";
import { apiClient } from "../utils/apiClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any, isPrivate: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>; // Made this required instead of optional
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extracted the user loading logic into checkAuth so it can be called from anywhere
  const checkAuth = async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const userData = await apiClient<User>("/api/users/me");
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user profile", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      }
    }
  };

  // On initial load, check auth and then stop loading
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

    // Fetch and set the user profile after successful login
    const userData = await apiClient<User>("/api/users/me");
    setUser(userData);
  };

  const register = async (userData: any, isPrivate: boolean) => {
    // 1. Register the user
    await apiClient("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    // 2. Automatically log them in
    await login({ login: userData.username, password: userData.password });

    // 3. The register API doesn't take 'isPrivate', so we PATCH it immediately after login
    if (isPrivate) {
      const updatedUser = await apiClient<User>("/api/users/me", {
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
        checkAuth, // Added checkAuth to the provider value here!
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
