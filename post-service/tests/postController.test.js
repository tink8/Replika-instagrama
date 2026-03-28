const postController = require("../controllers/postController");
const pool = require("../config/db");
const minioHelper = require("../utils/minioHelper");
const axios = require("axios");
const ApiError = require("../utils/ApiError");

jest.mock("../config/db");
jest.mock("../utils/minioHelper");
jest.mock("axios");

describe("Post Controller", () => {
  let req, res, next, mockConnection;

  beforeEach(() => {
    req = {
      user: { userId: "user1" },
      body: {},
      params: {},
      query: {},
      headers: { authorization: "Bearer token" },
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();

    // Mock MySQL connection for transactions
    mockConnection = {
      beginTransaction: jest.fn(),
      query: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    pool.getConnection = jest.fn().mockResolvedValue(mockConnection);
    pool.query = jest.fn();
  });

  // --- createPost Tests ---
  it("should create a post successfully", async () => {
    req.body.description = "Hello world";
    req.files = [{ mimetype: "image/jpeg", buffer: Buffer.from("test") }];
    minioHelper.uploadFile.mockResolvedValue("/post-media/test.jpg");

    await postController.createPost(req, res, next);

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.query).toHaveBeenCalledTimes(2); // Insert post, Insert media
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Post created successfully" }),
    );
  });

  it("should throw 400 if no media files are provided", async () => {
    req.files = [];

    await postController.createPost(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(mockConnection.rollback).not.toHaveBeenCalled(); // Failed before transaction started
  });

  // --- getPost Tests ---
  it("should fetch a post and its interaction counts", async () => {
    req.params.postId = "post1";

    // Mock DB returning a post owned by the requester
    pool.query.mockResolvedValue([
      [
        {
          id: "post1",
          user_id: "user1",
          description: "test",
          media_id: "m1",
          media_url: "/m1.jpg",
        },
      ],
    ]);

    // Mock Interaction Service response
    axios.get.mockResolvedValue({ data: { likes: 10, comments: 5 } });

    await postController.getPost(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "post1",
        likes: 10,
        comments: 5,
        media: expect.any(Array),
      }),
    );
  });

  // --- deletePost Tests ---
  it("should delete a post successfully", async () => {
    req.params.postId = "post1";

    // Mock DB returning the post owned by user1
    mockConnection.query
      .mockResolvedValueOnce([[{ user_id: "user1" }]]) // Check owner
      .mockResolvedValueOnce([[{ media_url: "/m1.jpg" }]]) // Get media to delete
      .mockResolvedValueOnce([]); // Delete query

    await postController.deletePost(req, res, next);

    expect(minioHelper.deleteFile).toHaveBeenCalledWith("/m1.jpg");
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Post deleted successfully",
    });
  });

  // --- updatePost Tests ---
  it("should update a post description successfully", async () => {
    req.params.postId = "post1";
    req.body.description = "Updated text";

    pool.query
      .mockResolvedValueOnce([[{ user_id: "user1" }]]) // Check owner
      .mockResolvedValueOnce([]); // Update query

    await postController.updatePost(req, res, next);

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      message: "Post updated successfully",
    });
  });

  it("should throw 403 if trying to update someone else's post", async () => {
    req.params.postId = "post1";
    req.body.description = "Updated text";

    pool.query.mockResolvedValueOnce([[{ user_id: "user2" }]]); // Owned by user2

    await postController.updatePost(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  // --- deleteMedia Tests ---
  it("should delete a single media item and keep the post if others remain", async () => {
    req.params.postId = "post1";
    req.params.mediaId = "media1";

    mockConnection.query
      .mockResolvedValueOnce([[{ user_id: "user1" }]]) // Check owner
      .mockResolvedValueOnce([[{ media_url: "/m1.jpg" }]]) // Get media
      .mockResolvedValueOnce([]) // Delete media
      .mockResolvedValueOnce([[{ count: 1 }]]); // 1 media item remaining

    await postController.deleteMedia(req, res, next);

    expect(minioHelper.deleteFile).toHaveBeenCalledWith("/m1.jpg");
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Media deleted successfully",
    });
  });

  it("should delete the entire post if the last media item is deleted", async () => {
    req.params.postId = "post1";
    req.params.mediaId = "media1";

    mockConnection.query
      .mockResolvedValueOnce([[{ user_id: "user1" }]]) // Check owner
      .mockResolvedValueOnce([[{ media_url: "/m1.jpg" }]]) // Get media
      .mockResolvedValueOnce([]) // Delete media
      .mockResolvedValueOnce([[{ count: 0 }]]) // 0 media items remaining
      .mockResolvedValueOnce([]); // Delete post

    await postController.deleteMedia(req, res, next);

    expect(mockConnection.query).toHaveBeenCalledTimes(5); // Includes the post deletion
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // --- getUserPosts Tests ---
  it("should fetch user posts without checking access if fetching own posts", async () => {
    req.params.userId = "user1"; // Same as req.user.userId

    pool.query.mockResolvedValueOnce([
      [
        {
          id: "post1",
          user_id: "user1",
          description: "test",
          media_id: "m1",
          media_url: "/m1.jpg",
        },
      ],
    ]);

    await postController.getUserPosts(req, res, next);

    expect(axios.get).not.toHaveBeenCalled(); // No access check needed
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    expect(res.json.mock.calls[0][0][0].id).toBe("post1");
  });

  it("should check access and fetch posts if fetching another user's posts", async () => {
    req.params.userId = "user2"; // Different from req.user.userId

    axios.get.mockResolvedValueOnce({ status: 200 }); // Access granted
    pool.query.mockResolvedValueOnce([
      [
        {
          id: "post2",
          user_id: "user2",
          description: "test",
          media_id: "m2",
          media_url: "/m2.jpg",
        },
      ],
    ]);

    await postController.getUserPosts(req, res, next);

    expect(axios.get).toHaveBeenCalled(); // Access check performed
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it("should throw 403 if access is denied to another user's posts", async () => {
    req.params.userId = "user2";

    axios.get.mockRejectedValueOnce({ response: { status: 403 } }); // Access denied

    await postController.getUserPosts(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled(); // Should not fetch posts
  });
});
