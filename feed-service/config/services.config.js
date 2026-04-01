const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  socialService: process.env.SOCIAL_SERVICE_URL || "http://social-service:8004",
  postService: process.env.POST_SERVICE_URL || "http://post-service:8003",
  userService: process.env.USER_SERVICE_URL || "http://user-service:8002",
  interactionService:
    process.env.INTERACTION_SERVICE_URL || "http://interaction-service:8006"
};
