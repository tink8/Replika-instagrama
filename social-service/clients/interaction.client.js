const axios = require("axios");
const { interactionServiceUrl } = require("../config/services.config");

const client = axios.create({
  baseURL: interactionServiceUrl,
  timeout: 5000
});

async function purgeInteractionsBetweenUsers(
  firstUserId,
  secondUserId,
  authorizationHeader
) {
  try {
    await client.delete("/internal/interactions/purge", {
      data: { firstUserId, secondUserId },
      headers: authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined
    });
  } catch (error) {
    if (error.response && error.response.status < 500) {
      throw error;
    }
  }
}

module.exports = {
  purgeInteractionsBetweenUsers
};
