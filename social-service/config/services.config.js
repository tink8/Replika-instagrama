const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

module.exports = {
  interactionServiceUrl:
    process.env.INTERACTION_SERVICE_URL || "http://interaction-service:8002",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://user-service:8001"
};
