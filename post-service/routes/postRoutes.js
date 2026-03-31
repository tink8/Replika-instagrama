import express from "express";
import multer from "multer";
import { postController } from "../controllers/postController.js";
import { AppError } from "../utils/errorHandler.js";
import { requireAuth } from "../utils/jwtMiddleware.js";

const router = express.Router();
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Only image and video files are allowed.",
          415,
          "INVALID_FILE_TYPE",
        ),
        false,
      );
    }
  },
});

router.use(requireAuth);

router.post("/", upload.array("media", 20), postController.createPost);
router.get("/user/:userId", postController.getUserPosts);
router.get("/:postId", postController.getPost);
router.patch("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.delete("/:postId/media/:mediaId", postController.deleteMedia);

export default router;
