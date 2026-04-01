const { buildTimeline } = require("./timeline.builder");

describe("timeline.builder", () => {
  test("enriches posts with author and interaction data", () => {
    const posts = [
      {
        id: "10",
        userId: "5",
        description: "hello",
        createdAt: "2026-03-24T10:00:00.000Z",
        media: []
      }
    ];

    const users = [
      {
        id: "5",
        username: "ana",
        name: "Ana",
        avatarUrl: "/avatars/ana.png"
      }
    ];

    const counts = {
      10: {
        likeCount: 7,
        commentCount: 2
      }
    };

    const result = buildTimeline(posts, users, counts);

    expect(result).toHaveLength(1);
    expect(result[0].user).toEqual({
      id: "5",
      username: "ana",
      avatarUrl: "/avatars/ana.png"
    });
    expect(result[0].likeCount).toBe(7);
    expect(result[0].commentCount).toBe(2);
  });

  test("falls back to empty values when enrichment is missing", () => {
    const posts = [
      {
        id: "11",
        userId: "9",
        media: []
      }
    ];

    const result = buildTimeline(posts, [], {});

    expect(result[0].user).toEqual({
      id: "9",
      username: "",
      avatarUrl: null
    });
    expect(result[0].likeCount).toBe(0);
    expect(result[0].commentCount).toBe(0);
  });
});
