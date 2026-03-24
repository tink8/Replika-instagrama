const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { healthCheck } = require("../controllers/social.controller");

const router = express.Router();

router.get("/", asyncHandler(healthCheck));

module.exports = router;
