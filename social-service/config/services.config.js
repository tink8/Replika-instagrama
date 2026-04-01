const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  interactionServiceUrl:
    process.env.INTERACTION_SERVICE_URL || "http://interaction-service:8006",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://user-service:8002"
};
