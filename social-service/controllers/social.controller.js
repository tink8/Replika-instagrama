const socialService = require("../services/social.service");
const { toIdString, parsePagination } = require("../utils/validators");

function getCurrentUserId(req) {
  return toIdString(req.userId || req.headers["x-user-id"], "X-User-Id");
}

async function followUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toIdString(req.params.userId, "userId");
  const result = await socialService.followUser(currentUserId, targetUserId);

  res.status(201).json(result);
}

async function unfollowUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toIdString(req.params.userId, "userId");
  await socialService.unfollowUser(currentUserId, targetUserId);

  res.status(204).send();
}

async function removeFollower(req, res) {
  const currentUserId = getCurrentUserId(req);
  const followerUserId = toIdString(req.params.userId, "userId");
  await socialService.removeFollower(currentUserId, followerUserId);

  res.status(204).send();
}

async function getFollowers(req, res) {
  const currentUserId = getCurrentUserId(req);
  const userId = toIdString(req.params.userId, "userId");
  const pagination = parsePagination(req.query);
  const followers = await socialService.listFollowers(
    currentUserId,
    userId,
    pagination
  );

  res.json(followers);
}

async function getFollowing(req, res) {
  const currentUserId = getCurrentUserId(req);
  const userId = toIdString(req.params.userId, "userId");
  const pagination = parsePagination(req.query);
  const following = await socialService.listFollowing(
    currentUserId,
    userId,
    pagination
  );

  res.json(following);
}

async function getFollowStatus(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toIdString(req.params.userId, "userId");
  const status = await socialService.getFollowStatus(currentUserId, targetUserId);

  res.json(status);
}

async function getCounts(req, res) {
  const userId = toIdString(req.params.userId, "userId");
  const counts = await socialService.getCounts(userId);

  res.json(counts);
}

async function getPendingRequests(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requests = await socialService.listPendingRequests(currentUserId);

  res.json({ requests });
}

async function acceptRequest(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requestId = toIdString(req.params.requestId, "requestId");
  const result = await socialService.updateFollowRequestStatus(
    currentUserId,
    requestId,
    "accepted"
  );

  res.json(result);
}

async function declineRequest(req, res) {
  const currentUserId = getCurrentUserId(req);
  const requestId = toIdString(req.params.requestId, "requestId");
  const result = await socialService.updateFollowRequestStatus(
    currentUserId,
    requestId,
    "declined"
  );

  res.json(result);
}

async function blockUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toIdString(req.params.userId, "userId");
  const result = await socialService.blockUser(currentUserId, targetUserId);

  res.status(201).json(result);
}

async function unblockUser(req, res) {
  const currentUserId = getCurrentUserId(req);
  const targetUserId = toIdString(req.params.userId, "userId");
  await socialService.unblockUser(currentUserId, targetUserId);

  res.status(204).send();
}

async function getBlockedUsers(req, res) {
  const currentUserId = getCurrentUserId(req);
  const blockedUsers = await socialService.listBlockedUsers(currentUserId);

  res.json(blockedUsers);
}

async function checkAccess(req, res) {
  const requesterId = toIdString(req.headers["x-user-id"], "X-User-Id");
  const targetUserId = toIdString(req.params.targetUserId, "targetUserId");
  const access = await socialService.checkAccess(requesterId, targetUserId);

  res.json(access);
}

async function getFollowingIdList(req, res) {
  const userId = toIdString(req.params.userId, "userId");
  const followingIds = await socialService.getFollowingIdList(userId);

  res.json({ followingIds });
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
