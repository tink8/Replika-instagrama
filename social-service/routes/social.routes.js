const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/social.controller");

const router = express.Router();

router.post("/follow/:userId", asyncHandler(controller.followUser));
router.delete("/follow/:userId", asyncHandler(controller.unfollowUser));
router.delete("/followers/:userId", asyncHandler(controller.removeFollower));
router.get("/followers/:userId", asyncHandler(controller.getFollowers));
router.get("/following/:userId", asyncHandler(controller.getFollowing));
router.get("/follow/status/:userId", asyncHandler(controller.getFollowStatus));
router.get("/counts/:userId", asyncHandler(controller.getCounts));

router.get("/requests", asyncHandler(controller.getPendingRequests));
router.put("/requests/:requestId/accept", asyncHandler(controller.acceptRequest));
router.put("/requests/:requestId/decline", asyncHandler(controller.declineRequest));

router.post("/block/:userId", asyncHandler(controller.blockUser));
router.delete("/block/:userId", asyncHandler(controller.unblockUser));
router.get("/blocks", asyncHandler(controller.getBlockedUsers));

module.exports = router;
