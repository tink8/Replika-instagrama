import pool from "../utils/db.js";

export const interactionModel = {
  findLike: async (postId, userId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM likes WHERE postId = ? AND userId = ?",
      [postId, userId],
    );
    return rows[0] || null;
  },

  createLike: async ({ id, postId, postOwnerId, userId }) => {
    await pool.execute(
      "INSERT INTO likes (id, postId, postOwnerId, userId) VALUES (?, ?, ?, ?)",
      [id, postId, postOwnerId, userId],
    );
  },

  deleteLike: async (postId, userId) => {
    const [result] = await pool.execute(
      "DELETE FROM likes WHERE postId = ? AND userId = ?",
      [postId, userId],
    );
    return result.affectedRows;
  },

  getLikeCount: async (postId) => {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM likes WHERE postId = ?",
      [postId],
    );
    return rows[0].total;
  },

  createComment: async ({ id, postId, postOwnerId, userId, text }) => {
    await pool.execute(
      `
        INSERT INTO comments (id, postId, postOwnerId, userId, text)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, postId, postOwnerId, userId, text],
    );
  },

  findCommentById: async (commentId) => {
    const [rows] = await pool.execute("SELECT * FROM comments WHERE id = ?", [
      commentId,
    ]);
    return rows[0] || null;
  },

  updateComment: async (commentId, text) => {
    await pool.execute("UPDATE comments SET text = ? WHERE id = ?", [
      text,
      commentId,
    ]);
  },

  deleteComment: async (commentId) => {
    const [result] = await pool.execute("DELETE FROM comments WHERE id = ?", [
      commentId,
    ]);
    return result.affectedRows;
  },

  getCommentsByPostId: async (postId, limit, offset) => {
    const [rows] = await pool.execute(
      `
        SELECT id, postId, userId, text, createdAt
        FROM comments
        WHERE postId = ?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `,
      [postId, String(limit), String(offset)],
    );

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM comments WHERE postId = ?",
      [postId],
    );

    return {
      comments: rows,
      total: countRows[0].total,
    };
  },

  getCountsForPost: async (postId) => {
    const [likeRows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM likes WHERE postId = ?",
      [postId],
    );
    const [commentRows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM comments WHERE postId = ?",
      [postId],
    );

    return {
      likeCount: likeRows[0].total,
      commentCount: commentRows[0].total,
    };
  },

  getCountsForPostIds: async (postIds, currentUserId = null) => {
    if (!postIds.length) return [];

    // Normalize all postIds to strings for reliable comparison
    const normalizedPostIds = postIds.map((id) => String(id).trim());
    const placeholders = normalizedPostIds.map(() => "?").join(",");
    const [likeRows] = await pool.execute(
      `
        SELECT postId, COUNT(*) AS likeCount
        FROM likes
        WHERE postId IN (${placeholders})
        GROUP BY postId
      `,
      normalizedPostIds,
    );
    const [commentRows] = await pool.execute(
      `
        SELECT postId, COUNT(*) AS commentCount
        FROM comments
        WHERE postId IN (${placeholders})
        GROUP BY postId
      `,
      normalizedPostIds,
    );

    const userLikedPostIds = new Set();
    if (currentUserId) {
      const [userLikeRows] = await pool.execute(
        `
          SELECT postId
          FROM likes
          WHERE userId = ? AND postId IN (${placeholders})
        `,
        [String(currentUserId), ...normalizedPostIds],
      );
      for (const row of userLikeRows) {
        userLikedPostIds.add(String(row.postId));
      }
    }

    const countsMap = new Map(
      normalizedPostIds.map((postId) => [
        postId,
        {
          postId,
          likeCount: 0,
          commentCount: 0,
          isLiked: userLikedPostIds.has(postId),
        },
      ]),
    );

    for (const row of likeRows) {
      const key = String(row.postId);
      if (countsMap.has(key)) {
        countsMap.get(key).likeCount = row.likeCount;
      }
    }

    for (const row of commentRows) {
      const key = String(row.postId);
      if (countsMap.has(key)) {
        countsMap.get(key).commentCount = row.commentCount;
      }
    }

    return normalizedPostIds.map((postId) => countsMap.get(postId));
  },

  purgeBetweenUsers: async (userA, userB) => {
    await pool.execute(
      `
        DELETE FROM likes
        WHERE (userId = ? AND postOwnerId = ?)
           OR (userId = ? AND postOwnerId = ?)
      `,
      [userA, userB, userB, userA],
    );

    await pool.execute(
      `
        DELETE FROM comments
        WHERE (userId = ? AND postOwnerId = ?)
           OR (userId = ? AND postOwnerId = ?)
      `,
      [userA, userB, userB, userA],
    );
  },
};
