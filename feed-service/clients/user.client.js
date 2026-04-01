const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.userService);

async function getUsersBatch(userIds) {
  if (!userIds.length) {
    return [];
  }

  const response = await client.post(
    "/internal/users/batch",
    { userIds }
  );

  return response.data.users || response.data.items || response.data || [];
}

module.exports = {
  getUsersBatch
};
