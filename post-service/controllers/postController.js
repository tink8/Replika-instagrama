const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const pool = require("../config/db");
const minioHelper = require("../utils/minioHelper");
const ApiError = require("../utils/ApiError");
const env = require("../config/env");

exports.createPost = async (req, res, next) => {
  const { description } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return next(
      new ApiError(
        400,
        "NO_MEDIA",
        "Post must contain at least one media file",
      ),
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const postId = uuidv4();
    await connection.query(
      "INSERT INTO posts (id, user_id, description) VALUES (?, ?, ?)",
      [postId, req.user.userId, description || null],
    );

    const mediaInserts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mediaId = uuidv4();
      const mediaUrl = await minioHelper.uploadFile(file);
      const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";

      mediaInserts.push([mediaId, postId, mediaUrl, mediaType, i]);
    }

    await connection.query(
      "INSERT INTO post_media (id, post_id, media_url, media_type, display_order) VALUES ?",
      [mediaInserts],
    );

    await connection.commit();
    res.status(201).json({ id: postId, message: "Post created successfully" });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT p.id, p.user_id, p.description, p.created_at,
             m.id as media_id, m.media_url, m.media_type, m.display_order
      FROM posts p
      LEFT JOIN post_media m ON p.id = m.post_id
      WHERE p.id = ?
      ORDER BY m.display_order ASC
    `,
      [req.params.postId],
    );

    if (rows.length === 0)
      throw new ApiError(404, "POST_NOT_FOUND", "Post not found");

    const post = {
      id: rows[0].id,
      userId: rows[0].user_id,
      description: rows[0].description,
      createdAt: rows[0].created_at,
      media: [],
    };

    rows.forEach((r) => {
      if (r.media_id) {
        post.media.push({
          id: r.media_id,
          url: r.media_url,
          type: r.media_type,
          order: r.display_order,
        });
      }
    });

    // Check access via Social Service (forwarding the JWT token)
    if (post.userId !== req.user.userId) {
      try {
        await axios.get(
          `${env.socialServiceUrl}/internal/social/check-access/${post.userId}`,
          {
            headers: { Authorization: req.headers.authorization },
          },
        );
      } catch (err) {
        if (err.response && err.response.status === 403) {
          throw new ApiError(
            403,
            "ACCESS_DENIED",
            "You do not have permission to view this post",
          );
        }
        throw new ApiError(
          500,
          "INTERNAL_SERVER_ERROR",
          "Failed to verify access",
        );
      }
    }

    // Fetch Interaction counts
    try {
      const countsRes = await axios.get(
        `${env.interactionServiceUrl}/internal/interactions/counts/${post.id}`,
      );
      post.likes = countsRes.data.likes || 0;
      post.comments = countsRes.data.comments || 0;
    } catch (err) {
      post.likes = 0;
      post.comments = 0; // Fallback if interaction service is down
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { description } = req.body;
    const [rows] = await pool.query("SELECT user_id FROM posts WHERE id = ?", [
      req.params.postId,
    ]);

    if (rows.length === 0)
      throw new ApiError(404, "POST_NOT_FOUND", "Post not found");
    if (rows[0].user_id !== req.user.userId)
      throw new ApiError(403, "ACCESS_DENIED", "You do not own this post");

    await pool.query("UPDATE posts SET description = ? WHERE id = ?", [
      description,
      req.params.postId,
    ]);
    res.json({ message: "Post updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [postRows] = await connection.query(
      "SELECT user_id FROM posts WHERE id = ?",
      [req.params.postId],
    );
    if (postRows.length === 0)
      throw new ApiError(404, "POST_NOT_FOUND", "Post not found");
    if (postRows[0].user_id !== req.user.userId)
      throw new ApiError(403, "ACCESS_DENIED", "You do not own this post");

    const [mediaRows] = await connection.query(
      "SELECT media_url FROM post_media WHERE post_id = ?",
      [req.params.postId],
    );

    for (const row of mediaRows) {
      await minioHelper.deleteFile(row.media_url);
    }

    await connection.query("DELETE FROM posts WHERE id = ?", [
      req.params.postId,
    ]);

    await connection.commit();
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

exports.deleteMedia = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [postRows] = await connection.query(
      "SELECT user_id FROM posts WHERE id = ?",
      [req.params.postId],
    );
    if (postRows.length === 0)
      throw new ApiError(404, "POST_NOT_FOUND", "Post not found");
    if (postRows[0].user_id !== req.user.userId)
      throw new ApiError(403, "ACCESS_DENIED", "You do not own this post");

    const [mediaRows] = await connection.query(
      "SELECT media_url FROM post_media WHERE id = ? AND post_id = ?",
      [req.params.mediaId, req.params.postId],
    );
    if (mediaRows.length === 0)
      throw new ApiError(404, "MEDIA_NOT_FOUND", "Media not found");

    await minioHelper.deleteFile(mediaRows[0].media_url);
    await connection.query("DELETE FROM post_media WHERE id = ?", [
      req.params.mediaId,
    ]);

    const [remaining] = await connection.query(
      "SELECT COUNT(*) as count FROM post_media WHERE post_id = ?",
      [req.params.postId],
    );
    if (remaining[0].count === 0) {
      await connection.query("DELETE FROM posts WHERE id = ?", [
        req.params.postId,
      ]);
    }

    await connection.commit();
    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const { limit = 20, offset = 0 } = req.query;

    if (targetUserId !== req.user.userId) {
      try {
        await axios.get(
          `${env.socialServiceUrl}/internal/social/check-access/${targetUserId}`,
          {
            headers: { Authorization: req.headers.authorization },
          },
        );
      } catch (err) {
        if (err.response && err.response.status === 403) {
          throw new ApiError(
            403,
            "ACCESS_DENIED",
            "You do not have permission to view these posts",
          );
        }
        throw new ApiError(
          500,
          "INTERNAL_SERVER_ERROR",
          "Failed to verify access",
        );
      }
    }

    const [rows] = await pool.query(
      `
      SELECT p.id, p.user_id, p.description, p.created_at,
             m.id as media_id, m.media_url, m.media_type, m.display_order
      FROM (
          SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
      ) p
      LEFT JOIN post_media m ON p.id = m.post_id
      ORDER BY p.created_at DESC, m.display_order ASC
    `,
      [targetUserId, Number(limit), Number(offset)],
    );

    const postsMap = new Map();
    rows.forEach((r) => {
      if (!postsMap.has(r.id)) {
        postsMap.set(r.id, {
          id: r.id,
          userId: r.user_id,
          description: r.description,
          createdAt: r.created_at,
          media: [],
        });
      }
      if (r.media_id) {
        postsMap.get(r.id).media.push({
          id: r.media_id,
          url: r.media_url,
          type: r.media_type,
          order: r.display_order,
        });
      }
    });

    res.json(Array.from(postsMap.values()));
  } catch (err) {
    next(err);
  }
};
