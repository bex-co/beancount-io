import { secureStringEqual } from "./secure-string-equal";

describe("secureStringEqual", () => {
  it("accepts equal strings", () => {
    expect(secureStringEqual("123456", "123456")).toBe(true);
  });

  it("rejects unequal strings of the same length", () => {
    expect(secureStringEqual("123456", "654321")).toBe(false);
  });

  it("rejects unequal strings of different lengths without throwing", () => {
    expect(secureStringEqual("123456", "wrong")).toBe(false);
  });
});
