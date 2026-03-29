import express from "express";
import { interactionController } from "../controllers/interactionController.js";
import { requireAuth } from "../utils/jwtMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post("/:postId", interactionController.likePost);
router.delete("/:postId", interactionController.unlikePost);
router.get("/:postId", interactionController.getLikeCount);

export default router;
