const axios = require("axios");
const { userServiceUrl } = require("../config/services.config");

const client = axios.create({
  baseURL: userServiceUrl,
  timeout: 5000
});

async function getUserProfile(userId) {
  const response = await client.get(`/internal/users/${encodeURIComponent(userId)}`);

  return response.data;
}

async function getUsersBatch(userIds) {
  if (!userIds.length) {
    return [];
  }

  const response = await client.post(
    "/internal/users/batch",
    { userIds }
  );

  return response.data.users || [];
}

module.exports = {
  getUserProfile,
  getUsersBatch
};
