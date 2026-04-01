jest.mock("../config/db", () => ({
  execute: jest.fn()
}));

jest.mock("../clients/interaction.client", () => ({
  purgeInteractionsBetweenUsers: jest.fn()
}));

jest.mock("../clients/user.client", () => ({
  getUserProfile: jest.fn(),
  getUsersBatch: jest.fn()
}));

const db = require("../config/db");
const {
  purgeInteractionsBetweenUsers
} = require("../clients/interaction.client");
const { getUserProfile, getUsersBatch } = require("../clients/user.client");
const socialService = require("./social.service");

async function expectHttpError(promise, status, code, message) {
  await expect(promise).rejects.toMatchObject({
    status,
    code,
    message
  });
}

describe("social.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("followUser auto-follows public users", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await expect(socialService.followUser("viewer", "target")).resolves.toEqual({
      status: "following",
      message: "Now following this user."
    });
  });

  test("followUser creates request for private users", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: true });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}]);

    await expect(socialService.followUser("viewer", "target")).resolves.toEqual({
      status: "requested",
      message: "Follow request sent."
    });
  });

  test("followUser rejects self-follow", async () => {
    await expectHttpError(
      socialService.followUser("same", "same"),
      400,
      "SELF_FOLLOW",
      "You cannot follow yourself."
    );
  });

  test("followUser rejects blocked target", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([
      [{ blockerId: "target", blockedId: "viewer" }]
    ]);

    await expectHttpError(
      socialService.followUser("viewer", "target"),
      403,
      "BLOCKED",
      "You cannot follow this user."
    );
  });

  test("followUser rejects when requester has blocked target", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([
      [{ blockerId: "viewer", blockedId: "target" }]
    ]);

    await expectHttpError(
      socialService.followUser("viewer", "target"),
      403,
      "BLOCKED",
      "You cannot follow a user you have blocked."
    );
  });

  test("followUser rejects already following", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ exists: 1 }]]);

    await expectHttpError(
      socialService.followUser("viewer", "target"),
      409,
      "ALREADY_FOLLOWING",
      "You are already following this user."
    );
  });

  test("followUser rejects existing pending request", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: true });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 17, status: "pending" }]]);

    await expectHttpError(
      socialService.followUser("viewer", "target"),
      409,
      "REQUEST_PENDING",
      "A follow request is already pending."
    );
  });

  test("unfollowUser rejects when no relationship exists", async () => {
    db.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    await expectHttpError(
      socialService.unfollowUser("viewer", "target"),
      404,
      "NOT_FOLLOWING",
      "You are not following this user."
    );
  });

  test("removeFollower rejects when user is not a follower", async () => {
    db.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    await expectHttpError(
      socialService.removeFollower("viewer", "target"),
      404,
      "NOT_A_FOLLOWER",
      "This user is not your follower."
    );
  });

  test("listFollowers returns paginated enriched users", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    getUsersBatch.mockResolvedValue([
      { id: "u1", name: "Ana", username: "ana", avatarUrl: null },
      { id: "u2", name: "Mika", username: "mika", avatarUrl: "x" }
    ]);
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[{ userId: "u1" }, { userId: "u2" }]]);

    await expect(
      socialService.listFollowers("viewer", "target", { page: 1, limit: 20 })
    ).resolves.toEqual({
      followers: [
        { id: "u1", name: "Ana", username: "ana", avatarUrl: null },
        { id: "u2", name: "Mika", username: "mika", avatarUrl: "x" }
      ],
      page: 1,
      totalPages: 1,
      totalCount: 2
    });
  });

  test("listFollowing rejects private profile for non-follower", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: true });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    await expectHttpError(
      socialService.listFollowing("viewer", "target", { page: 1, limit: 20 }),
      403,
      "ACCESS_DENIED",
      "This profile is private."
    );
  });

  test("getFollowStatus returns blocked state", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([
      [{ blockerId: "target", blockedId: "viewer" }]
    ]);

    await expect(socialService.getFollowStatus("viewer", "target")).resolves.toEqual({
      status: "blocked_by_them"
    });
  });

  test("getFollowStatus returns requested state", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 1, status: "pending" }]]);

    await expect(socialService.getFollowStatus("viewer", "target")).resolves.toEqual({
      status: "requested"
    });
  });

  test("getCounts returns follower and following counts", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute
      .mockResolvedValueOnce([[{ total: 5 }]])
      .mockResolvedValueOnce([[{ total: 3 }]]);

    await expect(socialService.getCounts("target")).resolves.toEqual({
      followerCount: 5,
      followingCount: 3
    });
  });

  test("listPendingRequests enriches request senders", async () => {
    getUsersBatch.mockResolvedValue([
      { id: "u1", name: "Ana", username: "ana", avatarUrl: null }
    ]);
    db.execute.mockResolvedValueOnce([
      [{ id: 12, requesterId: "u1", createdAt: "2026-01-01T00:00:00.000Z" }]
    ]);

    await expect(socialService.listPendingRequests("target")).resolves.toEqual([
      {
        id: "12",
        from: { id: "u1", name: "Ana", username: "ana", avatarUrl: null },
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
  });

  test("updateFollowRequestStatus accepts request", async () => {
    db.execute
      .mockResolvedValueOnce([
        [{ id: "17", requesterId: "u1", targetUserId: "target", status: "pending" }]
      ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await expect(
      socialService.updateFollowRequestStatus("target", "17", "accepted")
    ).resolves.toEqual({
      message: "Follow request accepted."
    });
  });

  test("updateFollowRequestStatus rejects wrong owner", async () => {
    db.execute.mockResolvedValueOnce([
      [{ id: "17", requesterId: "u1", targetUserId: "someone-else", status: "pending" }]
    ]);

    await expectHttpError(
      socialService.updateFollowRequestStatus("target", "17", "accepted"),
      403,
      "ACCESS_DENIED",
      "You cannot manage this request."
    );
  });

  test("blockUser inserts block and purges interactions", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    purgeInteractionsBetweenUsers.mockResolvedValue();
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await expect(socialService.blockUser("viewer", "target")).resolves.toEqual({
      message: "User blocked."
    });
    expect(purgeInteractionsBetweenUsers).toHaveBeenCalledWith("viewer", "target");
  });

  test("blockUser rejects already blocked user", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([[{ exists: 1 }]]);

    await expectHttpError(
      socialService.blockUser("viewer", "target"),
      409,
      "ALREADY_BLOCKED",
      "You have already blocked this user."
    );
  });

  test("blockUser maps purge failure to service unavailable", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    purgeInteractionsBetweenUsers.mockRejectedValue(new Error("down"));
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await expectHttpError(
      socialService.blockUser("viewer", "target"),
      502,
      "SERVICE_UNAVAILABLE",
      "The requested service is currently unavailable."
    );
  });

  test("unblockUser rejects when user is not blocked", async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

    await expectHttpError(
      socialService.unblockUser("viewer", "target"),
      404,
      "NOT_BLOCKED",
      "This user is not blocked."
    );
  });

  test("listBlockedUsers enriches blocked users", async () => {
    getUsersBatch.mockResolvedValue([
      { id: "u2", name: "Mika", username: "mika", avatarUrl: null }
    ]);
    db.execute.mockResolvedValueOnce([[{ userId: "u2" }]]);

    await expect(socialService.listBlockedUsers("viewer")).resolves.toEqual({
      blockedUsers: [
        { id: "u2", name: "Mika", username: "mika", avatarUrl: null }
      ]
    });
  });

  test("checkAccess handles all major visibility states", async () => {
    getUserProfile
      .mockResolvedValueOnce({ id: "target", isPrivate: false })
      .mockResolvedValueOnce({ id: "target2", isPrivate: true })
      .mockResolvedValueOnce({ id: "target3", isPrivate: true });
    db.execute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ exists: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    await expect(socialService.checkAccess("viewer", "target")).resolves.toEqual({
      hasAccess: true,
      reason: "public_profile"
    });

    await expect(socialService.checkAccess("viewer", "target2")).resolves.toEqual({
      hasAccess: true,
      reason: "following"
    });

    await expect(socialService.checkAccess("viewer", "target3")).resolves.toEqual({
      hasAccess: false,
      reason: "private_profile"
    });
  });

  test("checkAccess returns own_profile for same user", async () => {
    getUserProfile.mockResolvedValue({ id: "viewer", isPrivate: true });

    await expect(socialService.checkAccess("viewer", "viewer")).resolves.toEqual({
      hasAccess: true,
      reason: "own_profile"
    });
  });

  test("checkAccess returns blocked_by_requester", async () => {
    getUserProfile.mockResolvedValue({ id: "target", isPrivate: false });
    db.execute.mockResolvedValueOnce([
      [{ blockerId: "viewer", blockedId: "target" }]
    ]);

    await expect(socialService.checkAccess("viewer", "target")).resolves.toEqual({
      hasAccess: false,
      reason: "blocked_by_requester"
    });
  });

  test("getFollowingIdList returns raw followed IDs", async () => {
    getUserProfile.mockResolvedValue({ id: "viewer", isPrivate: false });
    db.execute.mockResolvedValueOnce([[{ userId: "u1" }, { userId: "u2" }]]);

    await expect(socialService.getFollowingIdList("viewer")).resolves.toEqual([
      "u1",
      "u2"
    ]);
  });

  test("maps missing user from user service to USER_NOT_FOUND", async () => {
    getUserProfile.mockRejectedValue({ response: { status: 404 } });

    await expectHttpError(
      socialService.getCounts("missing"),
      404,
      "USER_NOT_FOUND",
      "User not found."
    );
  });

  test("maps user batch failures to service unavailable", async () => {
    getUsersBatch.mockRejectedValue(new Error("down"));
    db.execute.mockResolvedValueOnce([[{ userId: "u2" }]]);

    await expectHttpError(
      socialService.listBlockedUsers("viewer"),
      502,
      "SERVICE_UNAVAILABLE",
      "The requested service is currently unavailable."
    );
  });
});
