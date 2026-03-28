const internalController = require("../controllers/internalController");
const pool = require("../config/db");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

describe("Internal Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {}, params: {} };
    res = { json: jest.fn() };
    next = jest.fn();
  });

  it("should return empty array if userIds is missing", async () => {
    await internalController.getPostsByUsers(req, res, next);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should fetch posts for given userIds", async () => {
    req.query.userIds = "user1,user2";
    const mockRows = [{ id: "post1" }, { id: "post2" }];
    pool.query.mockResolvedValue([mockRows]);

    await internalController.getPostsByUsers(req, res, next);

    expect(pool.query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(mockRows);
  });

  it("should return exists: true if post is found", async () => {
    req.params.postId = "post1";
    pool.query.mockResolvedValue([[{ id: "post1", user_id: "user1" }]]);

    await internalController.checkPostExists(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ exists: true, ownerId: "user1" });
  });

  it("should return exists: false if post is not found", async () => {
    req.params.postId = "invalid-post";
    pool.query.mockResolvedValue([[]]);

    await internalController.checkPostExists(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ exists: false });
  });
});
