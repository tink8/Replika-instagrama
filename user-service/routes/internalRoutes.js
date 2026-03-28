import express from "express";
import { internalController } from "../controllers/internalController.js";

const router = express.Router();

// Create a user profile (Called by Auth Service during registration)
router.post("/", internalController.createUserProfile);

// Lookup user by username (Called by Auth Service during login)
router.get("/by-username/:username", internalController.getUserByUsername);

// Lookup user by email (Called by Auth Service during login)
router.get("/by-email/:email", internalController.getUserByEmail);

// Get user details for a list of user IDs (Called by Feed/Interaction services)
router.post("/batch", internalController.getUsersBatch);

export default router;
