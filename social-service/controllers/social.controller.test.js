jest.mock("../services/social.service", () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  removeFollower: jest.fn(),
  listFollowers: jest.fn(),
  listFollowing: jest.fn(),
  getFollowStatus: jest.fn(),
  getCounts: jest.fn(),
  listPendingRequests: jest.fn(),
  updateFollowRequestStatus: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  listBlockedUsers: jest.fn(),
  checkAccess: jest.fn(),
  getFollowingIdList: jest.fn()
}));

const socialService = require("../services/social.service");
const controller = require("./social.controller");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };
}

describe("social.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("followUser returns 201 with docs-aligned payload", async () => {
    socialService.followUser.mockResolvedValue({
      message: "Follow request sent.",
      status: "requested"
    });

    const req = {
      headers: { "x-user-id": "user-3" },
      params: { userId: "user-8" }
    };
    const res = createResponse();

    await controller.followUser(req, res);

    expect(socialService.followUser).toHaveBeenCalledWith("user-3", "user-8");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Follow request sent.",
      status: "requested"
    });
  });

  test("unfollowUser returns 204", async () => {
    const req = {
      headers: { "x-user-id": "user-3" },
      params: { userId: "user-8" }
    };
    const res = createResponse();

    await controller.unfollowUser(req, res);

    expect(socialService.unfollowUser).toHaveBeenCalledWith("user-3", "user-8");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  test("removeFollower returns 204", async () => {
    const req = {
      headers: { "x-user-id": "user-3" },
      params: { userId: "user-9" }
    };
    const res = createResponse();

    await controller.removeFollower(req, res);

    expect(socialService.removeFollower).toHaveBeenCalledWith("user-3", "user-9");
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test("getFollowers passes pagination through", async () => {
    socialService.listFollowers.mockResolvedValue({
      followers: [],
      page: 2,
      totalPages: 3,
      totalCount: 50
    });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { userId: "target" },
      query: { page: "2", limit: "10" }
    };
    const res = createResponse();

    await controller.getFollowers(req, res);

    expect(socialService.listFollowers).toHaveBeenCalledWith("viewer", "target", {
      page: 2,
      limit: 10,
      offset: 10
    });
    expect(res.json).toHaveBeenCalledWith({
      followers: [],
      page: 2,
      totalPages: 3,
      totalCount: 50
    });
  });

  test("getFollowing passes pagination through", async () => {
    socialService.listFollowing.mockResolvedValue({
      following: [],
      page: 1,
      totalPages: 0,
      totalCount: 0
    });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { userId: "target" },
      query: {}
    };
    const res = createResponse();

    await controller.getFollowing(req, res);

    expect(socialService.listFollowing).toHaveBeenCalledWith("viewer", "target", {
      page: 1,
      limit: 20,
      offset: 0
    });
    expect(res.json).toHaveBeenCalled();
  });

  test("getFollowStatus returns status payload", async () => {
    socialService.getFollowStatus.mockResolvedValue({ status: "following" });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { userId: "target" }
    };
    const res = createResponse();

    await controller.getFollowStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({ status: "following" });
  });

  test("getCounts returns counts payload", async () => {
    socialService.getCounts.mockResolvedValue({
      followerCount: 1,
      followingCount: 2
    });

    const req = {
      params: { userId: "target" }
    };
    const res = createResponse();

    await controller.getCounts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      followerCount: 1,
      followingCount: 2
    });
  });

  test("getPendingRequests wraps requests key", async () => {
    socialService.listPendingRequests.mockResolvedValue([{ id: "r1" }]);

    const req = {
      headers: { "x-user-id": "viewer" }
    };
    const res = createResponse();

    await controller.getPendingRequests(req, res);

    expect(res.json).toHaveBeenCalledWith({
      requests: [{ id: "r1" }]
    });
  });

  test("acceptRequest delegates accepted status", async () => {
    socialService.updateFollowRequestStatus.mockResolvedValue({
      message: "Follow request accepted."
    });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { requestId: "17" }
    };
    const res = createResponse();

    await controller.acceptRequest(req, res);

    expect(socialService.updateFollowRequestStatus).toHaveBeenCalledWith(
      "viewer",
      "17",
      "accepted"
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "Follow request accepted."
    });
  });

  test("declineRequest delegates declined status", async () => {
    socialService.updateFollowRequestStatus.mockResolvedValue({
      message: "Follow request declined."
    });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { requestId: "17" }
    };
    const res = createResponse();

    await controller.declineRequest(req, res);

    expect(socialService.updateFollowRequestStatus).toHaveBeenCalledWith(
      "viewer",
      "17",
      "declined"
    );
  });

  test("blockUser returns 201", async () => {
    socialService.blockUser.mockResolvedValue({ message: "User blocked." });

    const req = {
      headers: { "x-user-id": "viewer" },
      params: { userId: "target" }
    };
    const res = createResponse();

    await controller.blockUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "User blocked." });
  });

  test("unblockUser returns 204", async () => {
    const req = {
      headers: { "x-user-id": "viewer" },
      params: { userId: "target" }
    };
    const res = createResponse();

    await controller.unblockUser(req, res);

    expect(socialService.unblockUser).toHaveBeenCalledWith("viewer", "target");
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test("getBlockedUsers returns payload as-is", async () => {
    socialService.listBlockedUsers.mockResolvedValue({
      blockedUsers: [{ id: "x" }]
    });

    const req = {
      headers: { "x-user-id": "viewer" }
    };
    const res = createResponse();

    await controller.getBlockedUsers(req, res);

    expect(res.json).toHaveBeenCalledWith({
      blockedUsers: [{ id: "x" }]
    });
  });

  test("checkAccess returns service result", async () => {
    socialService.checkAccess.mockResolvedValue({
      hasAccess: false,
      reason: "blocked_by_target"
    });

    const req = {
      headers: { "x-user-id": "user-2" },
      params: { targetUserId: "user-9" }
    };
    const res = createResponse();

    await controller.checkAccess(req, res);

    expect(socialService.checkAccess).toHaveBeenCalledWith("user-2", "user-9");
    expect(res.json).toHaveBeenCalledWith({
      hasAccess: false,
      reason: "blocked_by_target"
    });
  });

  test("getFollowingIdList returns list payload", async () => {
    socialService.getFollowingIdList.mockResolvedValue(["4", "7", "8"]);

    const req = {
      params: { userId: "2" }
    };
    const res = createResponse();

    await controller.getFollowingIdList(req, res);

    expect(res.json).toHaveBeenCalledWith({
      followingIds: ["4", "7", "8"]
    });
  });

  test("healthCheck returns service status", async () => {
    const req = {};
    const res = createResponse();

    await controller.healthCheck(req, res);

    expect(res.json).toHaveBeenCalledWith({
      status: "ok",
      service: "social-service"
    });
  });
});
