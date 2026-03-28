const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const requireAuth = require("../middleware/auth");
const uploadMiddleware = require("../middleware/upload");

// All public post routes require authentication (Zero Trust)
router.use(requireAuth);

router.post("/", uploadMiddleware, postController.createPost);
router.get("/:postId", postController.getPost);
router.patch("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.delete("/:postId/media/:mediaId", postController.deleteMedia);
router.get("/user/:userId", postController.getUserPosts);

module.exports = router;
