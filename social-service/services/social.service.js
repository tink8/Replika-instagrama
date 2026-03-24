const db = require("../config/db");
const HttpError = require("../utils/httpError");
const { purgeInteractionsBetweenUsers } = require("../clients/interaction.client");
const { getUserProfile } = require("../clients/user.client");

async function ensureUsersAreDifferent(firstUserId, secondUserId) {
  if (firstUserId === secondUserId) {
    throw new HttpError(400, "Operacija nad sopstvenim nalogom nije dozvoljena.");
  }
}

async function isBlockedEitherWay(firstUserId, secondUserId) {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?)
         OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1
    `,
    [firstUserId, secondUserId, secondUserId, firstUserId]
  );

  return rows.length > 0;
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

async function followUser(requesterId, targetUserId, authorizationHeader) {
  await ensureUsersAreDifferent(requesterId, targetUserId);

  if (await isBlockedEitherWay(requesterId, targetUserId)) {
    throw new HttpError(403, "Pracenje nije dozvoljeno izmedju blokiranih korisnika.");
  }

  if (await isFollowing(requesterId, targetUserId)) {
    return {
      message: "Korisnik je vec pracen.",
      status: "following"
    };
  }

  const profile = await getUserProfile(
    targetUserId,
    requesterId,
    authorizationHeader
  );
  const isPrivate = Boolean(profile?.isPrivate);

  if (!isPrivate) {
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
      message: "Uspesno pracenje korisnika.",
      status: "following"
    };
  }

  const existingRequest = await getExistingFollowRequest(requesterId, targetUserId);
  if (existingRequest && existingRequest.status === "pending") {
    return {
      message: "Zahtev za pracenje je vec poslat.",
      status: "requested",
      requestId: existingRequest.id
    };
  }

  const [result] = await db.execute(
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
    message: "Zahtev za pracenje je poslat.",
    status: "requested",
    requestId: result.insertId
  };
}

async function unfollowUser(requesterId, targetUserId) {
  await db.execute(
    `
      DELETE FROM follows
      WHERE follower_id = ? AND following_id = ?
    `,
    [requesterId, targetUserId]
  );

  await db.execute(
    `
      DELETE FROM follow_requests
      WHERE requester_id = ? AND target_user_id = ? AND status = 'pending'
    `,
    [requesterId, targetUserId]
  );

  return { message: "Pracenje je uklonjeno." };
}

async function removeFollower(currentUserId, followerUserId) {
  await db.execute(
    `
      DELETE FROM follows
      WHERE follower_id = ? AND following_id = ?
    `,
    [followerUserId, currentUserId]
  );

  await db.execute(
    `
      DELETE FROM follow_requests
      WHERE requester_id = ? AND target_user_id = ? AND status = 'pending'
    `,
    [followerUserId, currentUserId]
  );

  return { message: "Pratilac je uklonjen." };
}

async function listFollowers(userId) {
  const [rows] = await db.execute(
    `
      SELECT follower_id AS userId, created_at AS createdAt
      FROM follows
      WHERE following_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

async function listFollowing(userId) {
  const [rows] = await db.execute(
    `
      SELECT following_id AS userId, created_at AS createdAt
      FROM follows
      WHERE follower_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

async function getFollowStatus(currentUserId, targetUserId) {
  const blocked = await isBlockedEitherWay(currentUserId, targetUserId);
  const following = await isFollowing(currentUserId, targetUserId);
  const followedBy = await isFollowing(targetUserId, currentUserId);
  const pendingRequest = await getExistingFollowRequest(currentUserId, targetUserId);

  return {
    blocked,
    following,
    followedBy,
    requested: pendingRequest?.status === "pending",
    requestId: pendingRequest?.id || null
  };
}

async function getCounts(userId) {
  const [[followersResult]] = await db.execute(
    `
      SELECT COUNT(*) AS followersCount
      FROM follows
      WHERE following_id = ?
    `,
    [userId]
  );

  const [[followingResult]] = await db.execute(
    `
      SELECT COUNT(*) AS followingCount
      FROM follows
      WHERE follower_id = ?
    `,
    [userId]
  );

  return {
    followersCount: followersResult.followersCount,
    followingCount: followingResult.followingCount
  };
}

async function listPendingRequests(userId) {
  const [rows] = await db.execute(
    `
      SELECT id, requester_id AS requesterId, target_user_id AS targetUserId, status, created_at AS createdAt
      FROM follow_requests
      WHERE target_user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
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
  if (!request) {
    throw new HttpError(404, "Zahtev za pracenje nije pronadjen.");
  }

  if (request.targetUserId !== currentUserId) {
    throw new HttpError(403, "Nemate dozvolu za obradu ovog zahteva.");
  }

  if (request.status !== "pending") {
    return {
      message: "Zahtev je vec obradjen.",
      requestId: request.id,
      status: request.status
    };
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
        ? "Zahtev za pracenje je prihvacen."
        : "Zahtev za pracenje je odbijen.",
    requestId: request.id,
    status
  };
}

async function blockUser(currentUserId, targetUserId, authorizationHeader) {
  await ensureUsersAreDifferent(currentUserId, targetUserId);

  await db.execute(
    `
      INSERT IGNORE INTO blocks (blocker_id, blocked_id)
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

  await purgeInteractionsBetweenUsers(
    currentUserId,
    targetUserId,
    authorizationHeader
  );

  return { message: "Korisnik je blokiran." };
}

async function unblockUser(currentUserId, targetUserId) {
  await db.execute(
    `
      DELETE FROM blocks
      WHERE blocker_id = ? AND blocked_id = ?
    `,
    [currentUserId, targetUserId]
  );

  return { message: "Korisnik je odblokiran." };
}

async function listBlockedUsers(userId) {
  const [rows] = await db.execute(
    `
      SELECT blocked_id AS userId, created_at AS createdAt
      FROM blocks
      WHERE blocker_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

async function checkAccess(requesterId, targetUserId, authorizationHeader) {
  if (requesterId === targetUserId) {
    return {
      allowed: true,
      reason: "self",
      blocked: false,
      following: false,
      isPrivate: false
    };
  }

  const blocked = await isBlockedEitherWay(requesterId, targetUserId);
  if (blocked) {
    return {
      allowed: false,
      reason: "blocked",
      blocked: true,
      following: false,
      isPrivate: false
    };
  }

  const profile = await getUserProfile(
    targetUserId,
    requesterId,
    authorizationHeader
  );
  const isPrivate = Boolean(profile?.isPrivate);
  const following = await isFollowing(requesterId, targetUserId);

  return {
    allowed: !isPrivate || following,
    reason: !isPrivate || following ? "allowed" : "private-account",
    blocked: false,
    following,
    isPrivate
  };
}

async function getFollowingIdList(userId) {
  const [rows] = await db.execute(
    `
      SELECT following_id AS userId
      FROM follows
      WHERE follower_id = ?
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows.map((row) => row.userId);
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
