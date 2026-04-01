const errorHandler = require("./errorHandler");

describe("errorHandler", () => {
  test("passes through when headers already sent", () => {
    const next = jest.fn();
    errorHandler(new Error("boom"), {}, { headersSent: true }, next);
    expect(next).toHaveBeenCalled();
  });

  test("returns standardized error payload", () => {
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    errorHandler(
      { status: 403, code: "ACCESS_DENIED", message: "Nope." },
      {},
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "ACCESS_DENIED",
        message: "Nope."
      }
    });
  });
});
