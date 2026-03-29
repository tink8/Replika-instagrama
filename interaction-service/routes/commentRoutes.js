import express from "express";
import { interactionController } from "../controllers/interactionController.js";
import { requireAuth } from "../utils/jwtMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.post("/:postId", interactionController.addComment);
router.get("/:postId", interactionController.getComments);
router.put("/:commentId", interactionController.updateComment);
router.delete("/:commentId", interactionController.deleteComment);

export default router;
