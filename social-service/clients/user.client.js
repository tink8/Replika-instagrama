const axios = require("axios");
const { userServiceUrl } = require("../config/services.config");

const client = axios.create({
  baseURL: userServiceUrl,
  timeout: 5000
});

async function getUserProfile(userId, requesterId, authorizationHeader) {
  const response = await client.get(`/internal/users/${userId}`, {
    params: requesterId ? { requesterId } : undefined,
    headers: authorizationHeader
      ? { Authorization: authorizationHeader }
      : undefined
  });

  return response.data;
}

module.exports = {
  getUserProfile
};
