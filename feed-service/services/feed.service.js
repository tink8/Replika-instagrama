const redis = require("../config/redis.config");
const { getFollowingIds } = require("../clients/social.client");
const { getPostsByUsers } = require("../clients/post.client");
const { getInteractionCounts } = require("../clients/interaction.client");
const { getUsersBatch } = require("../clients/user.client");
const { buildTimeline } = require("./timeline.builder");

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

function createFeedServiceError() {
  const error = new Error("Unable to load feed. Please try again.");
  error.status = 502;
  error.code = "SERVICE_UNAVAILABLE";
  return error;
}

async function buildFeed(currentUserId, pagination, authorizationHeader, forceRefresh) {
  const { page, limit } = pagination;
  const key = cacheKey(currentUserId, page, limit);

  if (forceRefresh) {
    await safeDeleteByPattern(currentUserId);
  }

  try {
    // --- Step 1: Get structural data (posts + authors), possibly from cache ---
    let structuralData = null;

    if (!forceRefresh) {
      const cached = await safeGetCache(key);
      if (cached) {
        structuralData = JSON.parse(cached);
      }
    }

    if (!structuralData) {
      // Fetch fresh structural data
      const followedUserIds = await getFollowingIds(currentUserId);

      if (!followedUserIds.length) {
        return { posts: [], page: 1, totalPages: 0 };
      }

      const postPayload = await getPostsByUsers(followedUserIds, page, limit);
      const posts = postPayload.posts || [];
      const authorIds = [
        ...new Set(
          posts
            .map((post) => String(post.authorId || post.userId || "").trim())
            .filter(Boolean)
        )
      ];

      const authors = await getUsersBatch(authorIds);

      // Build timeline WITHOUT interaction counts — these are just structural posts + authors
      const timelinePosts = buildTimeline(posts, authors, []).sort(
        (firstPost, secondPost) =>
          new Date(secondPost.createdAt || 0) - new Date(firstPost.createdAt || 0)
      );

      structuralData = {
        posts: timelinePosts,
        page: Number(postPayload.page || page),
        totalPages: Number(postPayload.totalPages || 0)
      };

      // Cache only the structural data (no interaction counts baked in)
      if (timelinePosts.length > 0) {
        await safeSetCache(key, structuralData);
      }
    }

    // --- Step 2: Always fetch fresh interaction counts ---
    const postIds = structuralData.posts.map((post) => post.id).filter(Boolean);

    if (postIds.length > 0) {
      const freshCounts = await getInteractionCounts(postIds, currentUserId);
      const countsMap = {};
      if (Array.isArray(freshCounts)) {
        for (const entry of freshCounts) {
          if (entry && entry.postId) {
            countsMap[entry.postId] = entry;
          }
        }
      }

      // Merge fresh interaction data into the structural posts
      structuralData.posts = structuralData.posts.map((post) => {
        const counts = countsMap[post.id] || countsMap[String(post.id)] || {};
        return {
          ...post,
          likeCount: Number(counts.likeCount || 0),
          commentCount: Number(counts.commentCount || 0),
          isLiked: Boolean(counts.isLiked)
        };
      });
    }

    return structuralData;
  } catch (error) {
    if (error.status && error.code) {
      throw error;
    }

    throw createFeedServiceError();
  }
}

module.exports = {
  buildFeed
};
