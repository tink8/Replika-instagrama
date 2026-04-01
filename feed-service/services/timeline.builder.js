function normalizeUsers(users) {
  const map = new Map();
  for (const user of users) {
    if (!user) {
      continue;
    }

    const userId = user.id || user.userId;
    if (userId) {
      map.set(String(userId), user);
    }
  }

  return map;
}

function normalizeCounts(countsPayload) {
  if (Array.isArray(countsPayload)) {
    return countsPayload.reduce((accumulator, entry) => {
      if (entry.postId) {
        accumulator[entry.postId] = entry;
      }
      return accumulator;
    }, {});
  }

  return countsPayload || {};
}

function buildTimeline(posts, authorPayload, countsPayload) {
  const authorsById = normalizeUsers(authorPayload);
  const countsByPostId = normalizeCounts(countsPayload);

  return posts.map((post) => {
    const authorId = String(post.authorId || post.userId || "");
    const author = authorsById.get(authorId) || null;
    const counts = countsByPostId[post.id] || countsByPostId[String(post.id)] || {};

    return {
      id: post.id,
      user: author
        ? {
            id: String(author.id || author.userId),
            username: author.username || "",
            avatarUrl: author.avatarUrl || author.avatar || null
          }
        : {
            id: authorId,
            username: "",
            avatarUrl: null
          },
      description: post.description ?? null,
      media: post.media || [],
      likeCount: Number(counts.likeCount || 0),
      commentCount: Number(counts.commentCount || 0),
      isLiked: Boolean(counts.isLiked),
      createdAt: post.createdAt || post.created_at || null
    };
  });
}

module.exports = {
  buildTimeline
};
