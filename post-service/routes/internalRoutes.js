import express from "express";
import { internalPostController } from "../controllers/internalPostController.js";

const router = express.Router();

router.get("/by-users", internalPostController.getPostsByUsers);
router.get("/:postId/exists", internalPostController.postExists);

export default router;
