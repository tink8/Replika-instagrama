/// <reference types="vite/client" />

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Helper to add the JWT token to requests
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // --- AUTH SERVICE ---
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json(); // Expected: { token, user: { id, username, ... } }
  },

  register: async (userData: any) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },

  // --- POST SERVICE ---
  getFeed: async () => {
    const res = await fetch(`${API_URL}/posts/feed`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch feed");
    return res.json(); // Expected: Array of posts
  },

  // --- USER SERVICE ---
  getUserProfile: async (username: string) => {
    const res = await fetch(`${API_URL}/users/${username}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },
};
