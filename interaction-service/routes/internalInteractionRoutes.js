import express from "express";
import { internalInteractionController } from "../controllers/internalInteractionController.js";

const router = express.Router();

router.get("/counts/batch", internalInteractionController.getBatchCounts);
router.get("/counts/:postId", internalInteractionController.getCountsForPost);
router.delete("/purge", internalInteractionController.purgeInteractions);

export default router;
