import { jest } from "@jest/globals";

const mockInteractionModel = {
  findLike: jest.fn(),
  createLike: jest.fn(),
  deleteLike: jest.fn(),
  getLikeCount: jest.fn(),
  createComment: jest.fn(),
  getCommentsByPostId: jest.fn(),
  findCommentById: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
};

const mockPostServiceClient = {
  getPostExists: jest.fn(),
};

const mockSocialServiceClient = {
  checkAccess: jest.fn(),
};

const mockUserServiceClient = {
  getUsersBatch: jest.fn(),
};

await jest.unstable_mockModule("../../models/interactionModel.js", () => ({
  interactionModel: mockInteractionModel,
}));

await jest.unstable_mockModule("../../utils/serviceClients.js", () => ({
  postServiceClient: mockPostServiceClient,
  socialServiceClient: mockSocialServiceClient,
  userServiceClient: mockUserServiceClient,
}));

const { interactionController } =
  await import("../../controllers/interactionController.js");

describe("interactionController", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      userId: "user-1",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("likes a post when access is allowed", async () => {
    req.params.postId = "post-1";
    mockPostServiceClient.getPostExists.mockResolvedValue({
      exists: true,
      ownerId: "owner-1",
    });
    mockSocialServiceClient.checkAccess.mockResolvedValue({ hasAccess: true });
    mockInteractionModel.findLike.mockResolvedValue(null);

    await interactionController.likePost(req, res, next);

    expect(mockInteractionModel.createLike).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Post liked." });
  });

  it("returns enriched comments with usernames", async () => {
    req.params.postId = "post-1";
    mockPostServiceClient.getPostExists.mockResolvedValue({
      exists: true,
      ownerId: "user-1",
    });
    mockInteractionModel.getCommentsByPostId.mockResolvedValue({
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          userId: "user-2",
          text: "hi",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    });
    mockUserServiceClient.getUsersBatch.mockResolvedValue([
      {
        id: "user-2",
        username: "mika",
        avatarUrl: null,
      },
    ]);

    await interactionController.getComments(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      comments: [
        {
          id: "comment-1",
          userId: "user-2",
          username: "mika",
          avatarUrl: null,
          text: "hi",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });
  });
});
