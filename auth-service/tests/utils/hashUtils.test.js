import { hashPassword, comparePassword } from "../../utils/hashUtils.js";

describe("hashUtils", () => {
  it("should hash a password and return a different string", async () => {
    const password = "mySecretPassword";
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(typeof hash).toBe("string");
  });

  it("should return true for a matching password", async () => {
    const password = "mySecretPassword";
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it("should return false for an incorrect password", async () => {
    const password = "mySecretPassword";
    const hash = await hashPassword(password);
    const isMatch = await comparePassword("wrongPassword", hash);
    expect(isMatch).toBe(false);
  });
});
