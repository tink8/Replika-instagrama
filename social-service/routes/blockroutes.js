const express = require("express");
const router = express.Router();

const {
    blockUser,
    unblockUser,
    checkBlock
} = require("../controllers/blockcontroller");

router.post("/block", blockUser);

router.post("/unblock", unblockUser);

router.get("/check-block", checkBlock);

module.exports = router;