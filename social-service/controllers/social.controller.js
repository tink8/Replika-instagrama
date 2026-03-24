const socialService = require("../services/social.service");
const { toPositiveInt } = require("../utils/validators");

function getCurrentUserId(req) {
  return toPositiveInt(req.userId || req.headers["x-user-id"], "X-User-Id");
}

async function followUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.userId, "userId");
  const result = await socialService.followUser(
    currentUserId,
    targetUserId,
    req.headers.authorization
  );

  res.status(result.status === "requested" ? 202 : 200).json(result);
}

async function unfollowUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.userId, "userId");
  const result = await socialService.unfollowUser(currentUserId, targetUserId);

  res.json(result);
}

async function removeFollower(req, res) {
  const currentUserId = getCurrentUserId(req);
  const followerUserId = toPositiveInt(req.params.userId, "userId");
  const result = await socialService.removeFollower(currentUserId, followerUserId);

  res.json(result);
}

async function getFollowers(req, res) {
  const userId = toPositiveInt(req.params.userId, "userId");
  const followers = await socialService.listFollowers(userId);

  res.json({ items: followers });
}

async function getFollowing(req, res) {
  const userId = toPositiveInt(req.params.userId, "userId");
  const following = await socialService.listFollowing(userId);

  res.json({ items: following });
}

async function getFollowStatus(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.userId, "userId");
  const status = await socialService.getFollowStatus(currentUserId, targetUserId);

  res.json(status);
}

async function getCounts(req, res) {
  const userId = toPositiveInt(req.params.userId, "userId");
  const counts = await socialService.getCounts(userId);

  res.json(counts);
}

async function getPendingRequests(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requests = await socialService.listPendingRequests(currentUserId);

  res.json({ items: requests });
}

async function acceptRequest(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requestId = toPositiveInt(req.params.requestId, "requestId");
  const result = await socialService.updateFollowRequestStatus(
    currentUserId,
    requestId,
    "accepted"
  );

  res.json(result);
}

async function declineRequest(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requestId = toPositiveInt(req.params.requestId, "requestId");
  const result = await socialService.updateFollowRequestStatus(
    currentUserId,
    requestId,
    "declined"
  );

  res.json(result);
}

async function blockUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.userId, "userId");
  const result = await socialService.blockUser(
    currentUserId,
    targetUserId,
    req.headers.authorization
  );

  res.json(result);
}

async function unblockUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.userId, "userId");
  const result = await socialService.unblockUser(currentUserId, targetUserId);

  res.json(result);
}

async function getBlockedUsers(req, res) {
  const currentUserId = getCurrentUserId(req);
  const blockedUsers = await socialService.listBlockedUsers(currentUserId);

  res.json({ items: blockedUsers });
}

async function checkAccess(req, res) {
  const requesterId = getCurrentUserId(req);
  const targetUserId = toPositiveInt(req.params.targetUserId, "targetUserId");
  const access = await socialService.checkAccess(
    requesterId,
    targetUserId,
    req.headers.authorization
  );

  res.json(access);
}

async function getFollowingIdList(req, res) {
  const userId = toPositiveInt(req.params.userId, "userId");
  const followingIds = await socialService.getFollowingIdList(userId);

  res.json({ userIds: followingIds });
}

async function healthCheck(req, res) {
  res.json({ status: "ok", service: "social-service" });
}

module.exports = {
  followUser,
  unfollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getCounts,
  getPendingRequests,
  acceptRequest,
  declineRequest,
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkAccess,
  getFollowingIdList,
  healthCheck
};
