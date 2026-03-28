import express from "express";
import multer from "multer";
import { userController } from "../controllers/userController.js";
import { AppError } from "../utils/errorHandler.js";
import { requireAuth } from "../utils/jwtMiddleware.js";

const router = express.Router();

// Configure Multer for Avatar Uploads
const storage = multer.memoryStorage(); // Store in memory to stream directly to MinIO
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new AppError("Only image files are allowed.", 415, "INVALID_FILE_TYPE"),
        false,
      );
    }
  },
});

// Apply JWT auth middleware to all public routes (Zero Trust)
router.use(requireAuth);

// Profile Management
router.get("/me", userController.getMe);
router.patch("/me", userController.updateMe);

// Avatar Management
router.put("/me/avatar", upload.single("avatar"), userController.uploadAvatar);
router.delete("/me/avatar", userController.deleteAvatar);

// Search & View Profiles
router.get("/search", userController.searchUsers);
router.get("/:userId", userController.getUserProfile);

export default router;
