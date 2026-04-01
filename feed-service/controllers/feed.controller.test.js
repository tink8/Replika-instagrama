jest.mock("../services/feed.service", () => ({
  buildFeed: jest.fn()
}));

const { buildFeed } = require("../services/feed.service");
const controller = require("./feed.controller");

describe("feed.controller", () => {
  test("getFeed returns aggregated payload", async () => {
    buildFeed.mockResolvedValue({
      posts: [{ id: "1" }],
      page: 1,
      totalPages: 1
    });

    const req = {
      headers: {
        "x-user-id": "user-12",
        authorization: "Bearer token"
      },
      query: {}
    };
    const res = {
      json: jest.fn()
    };

    await controller.getFeed(req, res);

    expect(buildFeed).toHaveBeenCalledWith(
      "user-12",
      { page: 1, limit: 20 },
      "Bearer token",
      false
    );
    expect(res.json).toHaveBeenCalledWith({
      posts: [{ id: "1" }],
      page: 1,
      totalPages: 1
    });
  });

  test("refreshFeed forces rebuild", async () => {
    buildFeed.mockResolvedValue({
      posts: [],
      page: 1,
      totalPages: 0
    });

    const req = {
      headers: {
        "x-user-id": "user-12"
      },
      query: {
        page: "2",
        limit: "5"
      }
    };
    const res = {
      json: jest.fn()
    };

    await controller.refreshFeed(req, res);

    expect(buildFeed).toHaveBeenCalledWith(
      "user-12",
      { page: 2, limit: 5 },
      undefined,
      true
    );
  });
});
