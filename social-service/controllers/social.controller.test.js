jest.mock("../services/social.service", () => ({
  followUser: jest.fn(),
  checkAccess: jest.fn(),
  getFollowingIdList: jest.fn()
}));

const socialService = require("../services/social.service");
const controller = require("./social.controller");

describe("social.controller", () => {
  test("followUser returns 202 when request is pending", async () => {
    socialService.followUser.mockResolvedValue({
      message: "Zahtev za pracenje je poslat.",
      status: "requested",
      requestId: 44
    });

    const req = {
      headers: {
        "x-user-id": "3"
      },
      params: {
        userId: "8"
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await controller.followUser(req, res);

    expect(socialService.followUser).toHaveBeenCalledWith(3, 8, undefined);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      message: "Zahtev za pracenje je poslat.",
      status: "requested",
      requestId: 44
    });
  });

  test("checkAccess returns service result", async () => {
    socialService.checkAccess.mockResolvedValue({
      allowed: false,
      reason: "blocked",
      blocked: true,
      following: false,
      isPrivate: false
    });

    const req = {
      headers: {
        "x-user-id": "2"
      },
      params: {
        targetUserId: "9"
      }
    };
    const res = {
      json: jest.fn()
    };

    await controller.checkAccess(req, res);

    expect(socialService.checkAccess).toHaveBeenCalledWith(2, 9, undefined);
    expect(res.json).toHaveBeenCalledWith({
      allowed: false,
      reason: "blocked",
      blocked: true,
      following: false,
      isPrivate: false
    });
  });

  test("getFollowingIdList returns list payload", async () => {
    socialService.getFollowingIdList.mockResolvedValue([4, 7, 8]);

    const req = {
      params: {
        userId: "2"
      }
    };
    const res = {
      json: jest.fn()
    };

    await controller.getFollowingIdList(req, res);

    expect(res.json).toHaveBeenCalledWith({
      userIds: [4, 7, 8]
    });
  });
});
