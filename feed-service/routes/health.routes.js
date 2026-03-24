const express = require("express");
const { healthCheck } = require("../controllers/feed.controller");

const router = express.Router();

router.get("/", healthCheck);

module.exports = router;
