const express = require("express");
const controller = require("../controllers/feed.controller");

const router = express.Router();

router.get("/", controller.getFeed);
router.get("/refresh", controller.refreshFeed);

module.exports = router;
