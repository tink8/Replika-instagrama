const pool = require("../config/db");

exports.getPostsByUsers = async (req, res, next) => {
  try {
    const { userIds, limit = 20, offset = 0 } = req.query;
    if (!userIds) return res.json([]);

    const ids = userIds.split(",");
    if (ids.length === 0) return res.json([]);

    // MySQL2 requires a placeholder '?' for each ID in the IN clause
    const placeholders = ids.map(() => "?").join(",");
    const query = `
      SELECT id, user_id, description, created_at 
      FROM posts 
      WHERE user_id IN (${placeholders}) 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [
      ...ids,
      Number(limit),
      Number(offset),
    ]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.checkPostExists = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = ?",
      [req.params.postId],
    );
    if (rows.length === 0) {
      return res.json({ exists: false });
    }
    res.json({ exists: true, ownerId: rows[0].user_id });
  } catch (err) {
    next(err);
  }
};
