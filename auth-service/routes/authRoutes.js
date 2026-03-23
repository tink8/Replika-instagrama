import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

// Define the registration route
// POST /api/auth/register
router.post("/register", register);

// Define the login route
// POST /api/auth/login
router.post("/login", login);

// Define the refresh token route
// POST /api/auth/refresh
router.post("/refresh", refreshToken);

// Define the logout route
// POST /api/auth/logout
router.post("/logout", logout);

export default router;
