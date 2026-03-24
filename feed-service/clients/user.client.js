const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.userService);

async function getUsersBatch(userIds, authHeaders) {
  if (!userIds.length) {
    return [];
  }

  const response = await client.post(
    "/internal/users/batch",
    { userIds },
    { headers: authHeaders }
  );

  return response.data.users || response.data.items || response.data || [];
}

module.exports = {
  getUsersBatch
};
