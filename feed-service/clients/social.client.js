const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.socialService);

async function getFollowingIds(userId, authHeaders) {
  const response = await client.get(`/internal/social/following/${userId}/list`, {
    headers: authHeaders
  });

  return response.data.userIds || [];
}

module.exports = {
  getFollowingIds
};
