const express = require("express");
const router = express.Router();
const internalController = require("../controllers/internalController");

router.get("/posts/by-users", internalController.getPostsByUsers);
router.get("/posts/:postId/exists", internalController.checkPostExists);

module.exports = router;
