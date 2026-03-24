const { buildFeed } = require("../services/feed.service");
const { parsePagination, extractCurrentUserId } = require("../utils/helpers");

async function getFeed(req, res) {
  const currentUserId = extractCurrentUserId(req);
  const pagination = parsePagination(req.query);
  const payload = await buildFeed(
    currentUserId,
    pagination,
    req.headers.authorization,
    false
  );

  res.json(payload);
}

async function refreshFeed(req, res) {
  const currentUserId = extractCurrentUserId(req);
  const pagination = parsePagination(req.query);
  const payload = await buildFeed(
    currentUserId,
    pagination,
    req.headers.authorization,
    true
  );

  res.json(payload);
}

async function healthCheck(req, res) {
  res.json({ status: "ok", service: "feed-service" });
}

module.exports = {
  getFeed,
  refreshFeed,
  healthCheck
};
