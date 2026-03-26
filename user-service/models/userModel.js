import pool from "../utils/db.js";

export const userModel = {
  createUser: async (id, name, username, email) => {
    const query = `
            INSERT INTO users (id, name, username, email, bio, avatarUrl, isPrivate) 
            VALUES (?, ?, ?, ?, NULL, NULL, false)
        `;
    await pool.execute(query, [id, name, username, email]);
  },

  findUserById: async (id) => {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  },

  findUserByUsername: async (username) => {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    return rows[0] || null;
  },

  findUserByEmail: async (email) => {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0] || null;
  },

  updateUserProfile: async (id, updates) => {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.username !== undefined) {
      fields.push("username = ?");
      values.push(updates.username);
    }
    if (updates.bio !== undefined) {
      fields.push("bio = ?");
      values.push(updates.bio);
    }
    if (updates.isPrivate !== undefined) {
      fields.push("isPrivate = ?");
      values.push(updates.isPrivate);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await pool.execute(query, values);
  },

  updateUserAvatar: async (id, avatarUrl) => {
    await pool.execute("UPDATE users SET avatarUrl = ? WHERE id = ?", [
      avatarUrl,
      id,
    ]);
  },

  removeUserAvatar: async (id) => {
    await pool.execute("UPDATE users SET avatarUrl = NULL WHERE id = ?", [id]);
  },

  searchUsers: async (searchQuery, limit, offset) => {
    const query = `
            SELECT id, name, username, avatarUrl 
            FROM users 
            WHERE name LIKE ? OR username LIKE ? 
            LIMIT ? OFFSET ?
        `;
    const likeQuery = `%${searchQuery}%`;
    const [rows] = await pool.execute(query, [
      likeQuery,
      likeQuery,
      String(limit),
      String(offset),
    ]);

    const [countResult] = await pool.execute(
      "SELECT COUNT(*) as total FROM users WHERE name LIKE ? OR username LIKE ?",
      [likeQuery, likeQuery],
    );

    return { users: rows, total: countResult[0].total };
  },

  getUsersBatch: async (userIds) => {
    if (!userIds || userIds.length === 0) return [];
    const placeholders = userIds.map(() => "?").join(",");
    const query = `SELECT id, name, username, avatarUrl FROM users WHERE id IN (${placeholders})`;
    const [rows] = await pool.execute(query, userIds);
    return rows;
  },
};
