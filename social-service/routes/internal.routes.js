const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/social.controller");

const router = express.Router();

router.get(
  "/check-access/:targetUserId",
  asyncHandler(controller.checkAccess)
);
router.get(
  "/following/:userId/list",
  asyncHandler(controller.getFollowingIdList)
);

module.exports = router;
