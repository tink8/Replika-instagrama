const { buildTimeline } = require("./timeline.builder");

describe("timeline.builder", () => {
  test("enriches posts with author and interaction data", () => {
    const posts = [
      {
        id: 10,
        authorId: 5,
        description: "hello",
        createdAt: "2026-03-24T10:00:00.000Z"
      }
    ];

    const users = [
      {
        id: 5,
        username: "ana",
        name: "Ana",
        avatarUrl: "/avatars/ana.png"
      }
    ];

    const counts = {
      10: {
        likesCount: 7,
        commentsCount: 2
      }
    };

    const result = buildTimeline(posts, users, counts);

    expect(result).toHaveLength(1);
    expect(result[0].author).toEqual({
      id: 5,
      username: "ana",
      name: "Ana",
      avatarUrl: "/avatars/ana.png"
    });
    expect(result[0].interactions).toEqual({
      likesCount: 7,
      commentsCount: 2
    });
  });

  test("falls back to empty values when enrichment is missing", () => {
    const posts = [
      {
        id: 11,
        userId: 9
      }
    ];

    const result = buildTimeline(posts, [], {});

    expect(result[0].author).toBeNull();
    expect(result[0].interactions).toEqual({
      likesCount: 0,
      commentsCount: 0
    });
  });
});
