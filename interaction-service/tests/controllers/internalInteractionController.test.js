import { jest } from "@jest/globals";

const mockInteractionModel = {
  getCountsForPost: jest.fn(),
  getCountsForPostIds: jest.fn(),
  purgeBetweenUsers: jest.fn(),
};

const mockPostServiceClient = {
  getPostExists: jest.fn(),
};

await jest.unstable_mockModule("../../models/interactionModel.js", () => ({
  interactionModel: mockInteractionModel,
}));

await jest.unstable_mockModule("../../utils/serviceClients.js", () => ({
  postServiceClient: mockPostServiceClient,
}));

const { internalInteractionController } =
  await import("../../controllers/internalInteractionController.js");

describe("internalInteractionController", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("returns counts for an existing post", async () => {
    req.params.postId = "post-1";
    mockPostServiceClient.getPostExists.mockResolvedValue({
      exists: true,
      ownerId: "owner-1",
    });
    mockInteractionModel.getCountsForPost.mockResolvedValue({
      likeCount: 4,
      commentCount: 2,
    });

    await internalInteractionController.getCountsForPost(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      postId: "post-1",
      likeCount: 4,
      commentCount: 2,
    });
  });

  it("validates purge query parameters", async () => {
    await internalInteractionController.purgeInteractions(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
