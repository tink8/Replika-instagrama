const db = require("../config/db");
const HttpError = require("../utils/httpError");
const { purgeInteractionsBetweenUsers } = require("../clients/interaction.client");
const { getUserProfile, getUsersBatch } = require("../clients/user.client");

async function getUserOrThrow(userId) {
  try {
    return await getUserProfile(userId);
  } catch (error) {
    if (error.response?.status === 404) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found.");
    }

    throw new HttpError(
      502,
      "SERVICE_UNAVAILABLE",
      "The requested service is currently unavailable."
    );
  }
}

async function getUsersBatchOrThrow(userIds) {
  try {
    return await getUsersBatch(userIds);
  } catch (error) {
    throw new HttpError(
      502,
      "SERVICE_UNAVAILABLE",
      "The requested service is currently unavailable."
    );
  }
}

function mapUserSummary(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user.id),
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null
  };
}

function orderUsersByIds(userIds, users) {
  const usersById = new Map(users.map((user) => [String(user.id), mapUserSummary(user)]));
  return userIds
    .map((userId) => usersById.get(String(userId)))
    .filter(Boolean);
}

async function getBlockRelation(firstUserId, secondUserId) {
  const [rows] = await db.execute(
    `
      SELECT blocker_id AS blockerId, blocked_id AS blockedId
      FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?)
         OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1
    `,
    [firstUserId, secondUserId, secondUserId, firstUserId]
  );

  const block = rows[0];
  if (!block) {
    return "none";
  }

  if (String(block.blockerId) === String(firstUserId)) {
    return "blocked_by_you";
  }

  return "blocked_by_them";
}

async function getExistingFollowRequest(requesterId, targetUserId) {
  const [rows] = await db.execute(
    `
      SELECT id, status
      FROM follow_requests
      WHERE requester_id = ? AND target_user_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [requesterId, targetUserId]
  );

  return rows[0] || null;
}

async function isFollowing(followerId, followingId) {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM follows
      WHERE follower_id = ? AND following_id = ?
      LIMIT 1
    `,
    [followerId, followingId]
  );

  return rows.length > 0;
}

async function ensureDistinctUsers(currentUserId, targetUserId, actionCode, message) {
  if (String(currentUserId) === String(targetUserId)) {
    throw new HttpError(400, actionCode, message);
  }
}

async function assertCanViewSocialGraph(requesterId, targetUserId) {
  const targetUser = await getUserOrThrow(targetUserId);

  if (String(requesterId) === String(targetUserId)) {
    return targetUser;
  }

  const blockRelation = await getBlockRelation(requesterId, targetUserId);
  if (blockRelation !== "none") {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found.");
  }

  if (targetUser.isPrivate && !(await isFollowing(requesterId, targetUserId))) {
    throw new HttpError(403, "ACCESS_DENIED", "This profile is private.");
  }

  return targetUser;
}

async function getPagedRelationshipUsers({
  countSql,
  rowsSql,
  params,
  page,
  limit,
  responseKey
}) {
  const [[countRow]] = await db.execute(countSql, params);
  const totalCount = Number(countRow.total || 0);

  const [rows] = await db.execute(rowsSql, [...params, String(limit), String((page - 1) * limit)]);
  const userIds = rows.map((row) => String(row.userId));
  const users = await getUsersBatchOrThrow(userIds);

  return {
    [responseKey]: orderUsersByIds(userIds, users),
    page,
    totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    totalCount
  };
}

async function followUser(requesterId, targetUserId) {
  await ensureDistinctUsers(
    requesterId,
    targetUserId,
    "SELF_FOLLOW",
    "You cannot follow yourself."
  );

  const targetUser = await getUserOrThrow(targetUserId);
  const blockRelation = await getBlockRelation(requesterId, targetUserId);

  if (blockRelation === "blocked_by_them") {
    throw new HttpError(403, "BLOCKED", "You cannot follow this user.");
  }

  if (blockRelation === "blocked_by_you") {
    throw new HttpError(
      403,
      "BLOCKED",
      "You cannot follow a user you have blocked."
    );
  }

  if (await isFollowing(requesterId, targetUserId)) {
    throw new HttpError(
      409,
      "ALREADY_FOLLOWING",
      "You are already following this user."
    );
  }

  const existingRequest = await getExistingFollowRequest(requesterId, targetUserId);
  if (existingRequest?.status === "pending") {
    throw new HttpError(
      409,
      "REQUEST_PENDING",
      "A follow request is already pending."
    );
  }

  if (!targetUser.isPrivate) {
    await db.execute(
      `
        INSERT IGNORE INTO follows (follower_id, following_id)
        VALUES (?, ?)
      `,
      [requesterId, targetUserId]
    );

    await db.execute(
      `
        DELETE FROM follow_requests
        WHERE requester_id = ? AND target_user_id = ?
      `,
      [requesterId, targetUserId]
    );

    return {
      status: "following",
      message: "Now following this user."
    };
  }

  await db.execute(
    `
      INSERT INTO follow_requests (requester_id, target_user_id, status)
      VALUES (?, ?, 'pending')
      ON DUPLICATE KEY UPDATE
        status = 'pending',
        responded_at = NULL,
        created_at = CURRENT_TIMESTAMP
    `,
    [requesterId, targetUserId]
  );

  return {
    status: "requested",
    message: "Follow request sent."
  };
}

async function unfollowUser(requesterId, targetUserId) {
  const [followResult] = await db.execute(
    `
      DELETE FROM follows
      WHERE follower_id = ? AND following_id = ?
    `,
    [requesterId, targetUserId]
  );

  const [requestResult] = await db.execute(
    `
      DELETE FROM follow_requests
      WHERE requester_id = ? AND target_user_id = ? AND status = 'pending'
    `,
    [requesterId, targetUserId]
  );

  if (!followResult.affectedRows && !requestResult.affectedRows) {
    throw new HttpError(
      404,
      "NOT_FOLLOWING",
      "You are not following this user."
    );
  }
}

async function removeFollower(currentUserId, followerUserId) {
  const [followResult] = await db.execute(
    `
      DELETE FROM follows
      WHERE follower_id = ? AND following_id = ?
    `,
    [followerUserId, currentUserId]
  );

  const [requestResult] = await db.execute(
    `
      DELETE FROM follow_requests
      WHERE requester_id = ? AND target_user_id = ? AND status = 'pending'
    `,
    [followerUserId, currentUserId]
  );

  if (!followResult.affectedRows && !requestResult.affectedRows) {
    throw new HttpError(
      404,
      "NOT_A_FOLLOWER",
      "This user is not your follower."
    );
  }
}

async function listFollowers(requesterId, targetUserId, pagination) {
  await assertCanViewSocialGraph(requesterId, targetUserId);

  return getPagedRelationshipUsers({
    countSql: `
      SELECT COUNT(*) AS total
      FROM follows
      WHERE following_id = ?
    `,
    rowsSql: `
      SELECT follower_id AS userId
      FROM follows
      WHERE following_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    params: [targetUserId],
    page: pagination.page,
    limit: pagination.limit,
    responseKey: "followers"
  });
}

async function listFollowing(requesterId, targetUserId, pagination) {
  await assertCanViewSocialGraph(requesterId, targetUserId);

  return getPagedRelationshipUsers({
    countSql: `
      SELECT COUNT(*) AS total
      FROM follows
      WHERE follower_id = ?
    `,
    rowsSql: `
      SELECT following_id AS userId
      FROM follows
      WHERE follower_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    params: [targetUserId],
    page: pagination.page,
    limit: pagination.limit,
    responseKey: "following"
  });
}

async function getFollowStatus(currentUserId, targetUserId) {
  await getUserOrThrow(targetUserId);

  if (String(currentUserId) === String(targetUserId)) {
    return { status: "none" };
  }

  const blockRelation = await getBlockRelation(currentUserId, targetUserId);
  if (blockRelation !== "none") {
    return { status: blockRelation };
  }

  if (await isFollowing(currentUserId, targetUserId)) {
    return { status: "following" };
  }

  const pendingRequest = await getExistingFollowRequest(currentUserId, targetUserId);
  if (pendingRequest?.status === "pending") {
    return { status: "requested" };
  }

  return { status: "none" };
}

async function getCounts(userId) {
  await getUserOrThrow(userId);

  const [[followerCountRow]] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM follows
      WHERE following_id = ?
    `,
    [userId]
  );

  const [[followingCountRow]] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM follows
      WHERE follower_id = ?
    `,
    [userId]
  );

  return {
    followerCount: Number(followerCountRow.total || 0),
    followingCount: Number(followingCountRow.total || 0)
  };
}

async function listPendingRequests(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        requester_id AS requesterId,
        created_at AS createdAt
      FROM follow_requests
      WHERE target_user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `,
    [userId]
  );

  const requesterIds = rows.map((row) => String(row.requesterId));
  const users = await getUsersBatchOrThrow(requesterIds);
  const userMap = new Map(users.map((user) => [String(user.id), mapUserSummary(user)]));

  return rows.map((row) => ({
    id: String(row.id),
    from: userMap.get(String(row.requesterId)) || null,
    createdAt: row.createdAt
  }));
}

async function updateFollowRequestStatus(currentUserId, requestId, status) {
  const [rows] = await db.execute(
    `
      SELECT id, requester_id AS requesterId, target_user_id AS targetUserId, status
      FROM follow_requests
      WHERE id = ?
      LIMIT 1
    `,
    [requestId]
  );

  const request = rows[0];
  if (!request || request.status !== "pending") {
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Follow request not found.");
  }

  if (String(request.targetUserId) !== String(currentUserId)) {
    throw new HttpError(
      403,
      "ACCESS_DENIED",
      "You cannot manage this request."
    );
  }

  await db.execute(
    `
      UPDATE follow_requests
      SET status = ?, responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [status, requestId]
  );

  if (status === "accepted") {
    await db.execute(
      `
        INSERT IGNORE INTO follows (follower_id, following_id)
        VALUES (?, ?)
      `,
      [request.requesterId, request.targetUserId]
    );
  }

  return {
    message:
      status === "accepted"
        ? "Follow request accepted."
        : "Follow request declined."
  };
}

async function blockUser(currentUserId, targetUserId) {
  await ensureDistinctUsers(
    currentUserId,
    targetUserId,
    "SELF_BLOCK",
    "You cannot block yourself."
  );

  await getUserOrThrow(targetUserId);

  const [existingRows] = await db.execute(
    `
      SELECT 1
      FROM blocks
      WHERE blocker_id = ? AND blocked_id = ?
      LIMIT 1
    `,
    [currentUserId, targetUserId]
  );

  if (existingRows.length) {
    throw new HttpError(
      409,
      "ALREADY_BLOCKED",
      "You have already blocked this user."
    );
  }

  await db.execute(
    `
      INSERT INTO blocks (blocker_id, blocked_id)
      VALUES (?, ?)
    `,
    [currentUserId, targetUserId]
  );

  await db.execute(
    `
      DELETE FROM follows
      WHERE (follower_id = ? AND following_id = ?)
         OR (follower_id = ? AND following_id = ?)
    `,
    [currentUserId, targetUserId, targetUserId, currentUserId]
  );

  await db.execute(
    `
      DELETE FROM follow_requests
      WHERE (requester_id = ? AND target_user_id = ?)
         OR (requester_id = ? AND target_user_id = ?)
    `,
    [currentUserId, targetUserId, targetUserId, currentUserId]
  );

  try {
    await purgeInteractionsBetweenUsers(currentUserId, targetUserId);
  } catch (error) {
    throw new HttpError(
      502,
      "SERVICE_UNAVAILABLE",
      "The requested service is currently unavailable."
    );
  }

  return { message: "User blocked." };
}

async function unblockUser(currentUserId, targetUserId) {
  const [result] = await db.execute(
    `
      DELETE FROM blocks
      WHERE blocker_id = ? AND blocked_id = ?
    `,
    [currentUserId, targetUserId]
  );

  if (!result.affectedRows) {
    throw new HttpError(404, "NOT_BLOCKED", "This user is not blocked.");
  }
}

async function listBlockedUsers(userId) {
  const [rows] = await db.execute(
    `
      SELECT blocked_id AS userId
      FROM blocks
      WHERE blocker_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  const userIds = rows.map((row) => String(row.userId));
  const users = await getUsersBatchOrThrow(userIds);

  return {
    blockedUsers: orderUsersByIds(userIds, users)
  };
}

async function checkAccess(requesterId, targetUserId) {
  const targetUser = await getUserOrThrow(targetUserId);

  if (String(requesterId) === String(targetUserId)) {
    return {
      hasAccess: true,
      reason: "own_profile"
    };
  }

  const blockRelation = await getBlockRelation(requesterId, targetUserId);
  if (blockRelation === "blocked_by_them") {
    return {
      hasAccess: false,
      reason: "blocked_by_target"
    };
  }

  if (blockRelation === "blocked_by_you") {
    return {
      hasAccess: false,
      reason: "blocked_by_requester"
    };
  }

  if (!targetUser.isPrivate) {
    return {
      hasAccess: true,
      reason: "public_profile"
    };
  }

  if (await isFollowing(requesterId, targetUserId)) {
    return {
      hasAccess: true,
      reason: "following"
    };
  }

  return {
    hasAccess: false,
    reason: "private_profile"
  };
}

async function getFollowingIdList(userId) {
  await getUserOrThrow(userId);

  const [rows] = await db.execute(
    `
      SELECT following_id AS userId
      FROM follows
      WHERE follower_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows.map((row) => String(row.userId));
}

module.exports = {
  followUser,
  unfollowUser,
  removeFollower,
  listFollowers,
  listFollowing,
  getFollowStatus,
  getCounts,
  listPendingRequests,
  updateFollowRequestStatus,
  blockUser,
  unblockUser,
  listBlockedUsers,
  checkAccess,
  getFollowingIdList
};
