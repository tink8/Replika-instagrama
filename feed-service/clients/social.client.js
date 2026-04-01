const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.socialService);

async function getFollowingIds(userId) {
  const response = await client.get(`/internal/social/following/${userId}/list`);

  return response.data.followingIds || [];
}

module.exports = {
  getFollowingIds
};
