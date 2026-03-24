jest.mock("../services/feed.service", () => ({
  buildFeed: jest.fn()
}));

const { buildFeed } = require("../services/feed.service");
const controller = require("./feed.controller");

describe("feed.controller", () => {
  test("getFeed returns aggregated payload", async () => {
    buildFeed.mockResolvedValue({
      items: [{ id: 1 }],
      meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 }
    });

    const req = {
      headers: {
        "x-user-id": "12",
        authorization: "Bearer token"
      },
      query: {}
    };
    const res = {
      json: jest.fn()
    };

    await controller.getFeed(req, res);

    expect(buildFeed).toHaveBeenCalledWith(
      12,
      { page: 1, limit: 10 },
      "Bearer token",
      false
    );
    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: 1 }],
      meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 }
    });
  });

  test("refreshFeed forces rebuild", async () => {
    buildFeed.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }
    });

    const req = {
      headers: {
        "x-user-id": "12"
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

    expect(buildFeed).toHaveBeenCalledWith(12, { page: 2, limit: 5 }, undefined, true);
  });
});
