function normalizeUsers(users) {
  const map = new Map();
  for (const user of users) {
    if (!user) {
      continue;
    }

    const userId = user.id || user.userId;
    if (userId) {
      map.set(Number(userId), user);
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
    const authorId = Number(post.authorId || post.userId);
    const author = authorsById.get(authorId) || null;
    const counts = countsByPostId[post.id] || countsByPostId[String(post.id)] || {};

    return {
      ...post,
      author: author
        ? {
            id: author.id || author.userId,
            username: author.username || null,
            name: author.name || null,
            avatarUrl: author.avatarUrl || author.avatar || null
          }
        : null,
      interactions: {
        likesCount: counts.likesCount || 0,
        commentsCount: counts.commentsCount || 0
      }
    };
  });
}

module.exports = {
  buildTimeline
};
