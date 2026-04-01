const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.postService);

async function getPostsByUsers(userIds, page, limit) {
  const response = await client.get("/internal/posts/by-users", {
    params: {
      userIds: userIds.join(","),
      page,
      limit
    }
  });

  return response.data;
}

module.exports = {
  getPostsByUsers
};
