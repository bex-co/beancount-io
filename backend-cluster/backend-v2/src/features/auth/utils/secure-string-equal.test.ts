import { secureStringEqual } from "./secure-string-equal";

describe("secureStringEqual", () => {
  it("accepts equal strings", () => {
    expect(secureStringEqual("1234", "1234")).toBe(true);
  });

  it("rejects unequal strings of the same length", () => {
    expect(secureStringEqual("1234", "4321")).toBe(false);
  });

  it("rejects unequal strings of different lengths without throwing", () => {
    expect(secureStringEqual("1234", "wrong")).toBe(false);
  });
});
