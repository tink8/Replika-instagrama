const services = require("../config/services.config");
const { createHttpClient } = require("./httpClient");

const client = createHttpClient(services.interactionService);

async function getInteractionCounts(postIds, currentUserId = null) {
  if (!postIds.length) {
    return [];
  }

  const response = await client.get("/internal/interactions/counts/batch", {
    params: {
      postIds: postIds.join(","),
      ...(currentUserId && { userId: currentUserId })
    }
  });

  return response.data.counts || response.data || {};
}

module.exports = {
  getInteractionCounts
};
