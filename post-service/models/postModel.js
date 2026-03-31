import pool from "../utils/db.js";

const mapMediaRow = (row) => ({
  id: row.mediaId,
  url: row.mediaUrl,
  type: row.mediaType,
  order: row.mediaOrder,
  objectKey: row.objectKey,
});

const mapPostRows = (rows) => {
  if (!rows.length) return null;

  const first = rows[0];
  return {
    id: first.postId,
    userId: first.userId,
    description: first.description,
    createdAt: first.createdAt,
    media: rows
      .filter((row) => row.mediaId)
      .map(mapMediaRow)
      .sort((a, b) => a.order - b.order),
  };
};

const mapPostsById = (rows) => {
  const posts = new Map();

  for (const row of rows) {
    if (!posts.has(row.postId)) {
      posts.set(row.postId, {
        id: row.postId,
        userId: row.userId,
        description: row.description,
        createdAt: row.createdAt,
        media: [],
      });
    }

    if (row.mediaId) {
      posts.get(row.postId).media.push(mapMediaRow(row));
    }
  }

  return Array.from(posts.values()).map((post) => ({
    ...post,
    media: post.media.sort((a, b) => a.order - b.order),
  }));
};

const fetchPostsWithMedia = async (postIds) => {
  if (!postIds.length) return [];

  const placeholders = postIds.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `
      SELECT
        p.id AS postId,
        p.userId,
        p.description,
        p.createdAt,
        m.id AS mediaId,
        m.url AS mediaUrl,
        m.type AS mediaType,
        m.orderIndex AS mediaOrder,
        m.objectKey
      FROM posts p
      LEFT JOIN post_media m ON p.id = m.postId
      WHERE p.id IN (${placeholders})
      ORDER BY p.createdAt DESC, m.orderIndex ASC
    `,
    postIds,
  );

  const posts = mapPostsById(rows);
  const orderMap = new Map(postIds.map((id, index) => [id, index]));
  return posts.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
};

export const postModel = {
  createPost: async ({ postId, userId, description, media }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        "INSERT INTO posts (id, userId, description) VALUES (?, ?, ?)",
        [postId, userId, description ?? null],
      );

      for (const item of media) {
        await connection.execute(
          `
            INSERT INTO post_media (id, postId, url, type, orderIndex, objectKey)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [item.id, postId, item.url, item.type, item.order, item.objectKey],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  findPostById: async (postId) => {
    const [rows] = await pool.execute(
      `
        SELECT
          p.id AS postId,
          p.userId,
          p.description,
          p.createdAt,
          m.id AS mediaId,
          m.url AS mediaUrl,
          m.type AS mediaType,
          m.orderIndex AS mediaOrder,
          m.objectKey
        FROM posts p
        LEFT JOIN post_media m ON p.id = m.postId
        WHERE p.id = ?
        ORDER BY m.orderIndex ASC
      `,
      [postId],
    );

    return mapPostRows(rows);
  },

  updatePostDescription: async (postId, description) => {
    await pool.execute("UPDATE posts SET description = ? WHERE id = ?", [
      description ?? null,
      postId,
    ]);
  },

  deletePost: async (postId) => {
    await pool.execute("DELETE FROM posts WHERE id = ?", [postId]);
  },

  findMediaById: async (postId, mediaId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM post_media WHERE postId = ? AND id = ?",
      [postId, mediaId],
    );
    return rows[0] || null;
  },

  deleteMedia: async (mediaId) => {
    await pool.execute("DELETE FROM post_media WHERE id = ?", [mediaId]);
  },

  countMediaForPost: async (postId) => {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM post_media WHERE postId = ?",
      [postId],
    );
    return rows[0].total;
  },

  findPostOwner: async (postId) => {
    const [rows] = await pool.execute("SELECT userId FROM posts WHERE id = ?", [
      postId,
    ]);
    return rows[0] || null;
  },

  getUserPosts: async (userId, limit, offset) => {
    const [idRows] = await pool.execute(
      `
        SELECT id
        FROM posts
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `,
      [userId, String(limit), String(offset)],
    );

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM posts WHERE userId = ?",
      [userId],
    );

    const postIds = idRows.map((row) => row.id);
    const posts = await fetchPostsWithMedia(postIds);

    return { posts, total: countRows[0].total };
  },

  getPostsByUserIds: async (userIds, limit, offset) => {
    if (!userIds.length) return { posts: [], total: 0 };

    const placeholders = userIds.map(() => "?").join(",");
    const [idRows] = await pool.execute(
      `
        SELECT id
        FROM posts
        WHERE userId IN (${placeholders})
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `,
      [...userIds, String(limit), String(offset)],
    );

    const [countRows] = await pool.execute(
      `
        SELECT COUNT(*) AS total
        FROM posts
        WHERE userId IN (${placeholders})
      `,
      userIds,
    );

    const postIds = idRows.map((row) => row.id);
    const posts = await fetchPostsWithMedia(postIds);

    return { posts, total: countRows[0].total };
  },
};
