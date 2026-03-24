const redis = require("../config/redis.config");
const { getFollowingIds } = require("../clients/social.client");
const { getPostsByUsers } = require("../clients/post.client");
const { getInteractionCounts } = require("../clients/interaction.client");
const { getUsersBatch } = require("../clients/user.client");
const { buildTimeline } = require("./timeline.builder");
const { buildPaginationMeta } = require("../utils/pagination");

function cacheKey(userId, page, limit) {
  return `feed:${userId}:page:${page}:limit:${limit}`;
}

async function safeGetCache(key) {
  try {
    return await redis.get(key);
  } catch (error) {
    return null;
  }
}

async function safeSetCache(key, payload) {
  try {
    await redis.set(key, JSON.stringify(payload), "EX", 60);
  } catch (error) {
    return null;
  }
}

async function safeDeleteByPattern(userId) {
  try {
    const keys = await redis.keys(`feed:${userId}:*`);
    if (keys.length) {
      await redis.del(...keys);
    }
  } catch (error) {
    return null;
  }
}

function buildAuthHeaders(currentUserId, authorizationHeader) {
  const headers = {
    "X-User-Id": String(currentUserId)
  };

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }

  return headers;
}

async function buildFeed(currentUserId, pagination, authorizationHeader, forceRefresh) {
  const { page, limit } = pagination;
  const key = cacheKey(currentUserId, page, limit);

  if (!forceRefresh) {
    const cached = await safeGetCache(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } else {
    await safeDeleteByPattern(currentUserId);
  }

  const authHeaders = buildAuthHeaders(currentUserId, authorizationHeader);
  const followedUserIds = await getFollowingIds(currentUserId, authHeaders);

  if (!followedUserIds.length) {
    const emptyPayload = {
      items: [],
      meta: buildPaginationMeta(page, limit, 0)
    };
    await safeSetCache(key, emptyPayload);
    return emptyPayload;
  }

  const postPayload = await getPostsByUsers(followedUserIds, page, limit, authHeaders);
  const posts = postPayload.items || postPayload.posts || [];
  const totalItems = postPayload.totalItems || postPayload.total || posts.length;
  const authorIds = [
    ...new Set(posts.map((post) => Number(post.authorId || post.userId)).filter(Boolean))
  ];
  const postIds = posts.map((post) => post.id).filter(Boolean);

  const [authors, counts] = await Promise.all([
    getUsersBatch(authorIds, authHeaders),
    getInteractionCounts(postIds, authHeaders)
  ]);

  const items = buildTimeline(posts, authors, counts).sort((firstPost, secondPost) => {
    return new Date(secondPost.createdAt || secondPost.created_at || 0) -
      new Date(firstPost.createdAt || firstPost.created_at || 0);
  });

  const payload = {
    items,
    meta: buildPaginationMeta(page, limit, totalItems)
  };

  await safeSetCache(key, payload);
  return payload;
}

module.exports = {
  buildFeed
};
