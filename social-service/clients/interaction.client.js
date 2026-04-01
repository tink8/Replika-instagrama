const axios = require("axios");
const { interactionServiceUrl } = require("../config/services.config");

const client = axios.create({
  baseURL: interactionServiceUrl,
  timeout: 5000
});

async function purgeInteractionsBetweenUsers(firstUserId, secondUserId) {
  await client.delete("/internal/interactions/purge", {
    params: { userA: firstUserId, userB: secondUserId }
  });
}

module.exports = {
  purgeInteractionsBetweenUsers
};
