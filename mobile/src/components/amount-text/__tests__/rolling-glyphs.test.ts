import { fitFontScale, rollingGlyphs } from "../rolling-glyphs";

describe("rollingGlyphs", () => {
  it("rolls digits and keeps separators, sign and symbol static", () => {
    expect(rollingGlyphs("-$1,204.50")).toEqual([
      { key: "s8", text: "-$" },
      { key: "d7", digit: 1 },
      { key: "s6", text: "," },
      { key: "d5", digit: 2 },
      { key: "d4", digit: 0 },
      { key: "d3", digit: 4 },
      { key: "s2", text: "." },
      { key: "d1", digit: 5 },
      { key: "d0", digit: 0 },
    ]);
  });

  it("keeps a trailing currency code as one static run", () => {
    expect(rollingGlyphs("400 MUSD")).toEqual([
      { key: "d7", digit: 4 },
      { key: "d6", digit: 0 },
      { key: "d5", digit: 0 },
      { key: "s0", text: " MUSD" },
    ]);
  });

  it("keys from the end so existing digits keep their slot as the figure grows", () => {
    const keys = (text: string) =>
      rollingGlyphs(text)
        .filter((glyph) => "digit" in glyph)
        .map((glyph) => glyph.key);
    // `$9.99` → `$10.00`: the three existing digit slots survive, one mounts.
    expect(keys("$9.99")).toEqual(["d3", "d1", "d0"]);
    expect(keys("$10.00")).toEqual(["d4", "d3", "d1", "d0"]);
  });

  it("returns nothing for an empty string", () => {
    expect(rollingGlyphs("")).toEqual([]);
  });
});

describe("fitFontScale", () => {
  it("keeps full size when the figure fits", () => {
    expect(fitFontScale(300, 200, 0.35)).toBe(1);
  });

  it("shrinks to the room available", () => {
    expect(fitFontScale(300, 400, 0.35)).toBe(0.75);
  });

  it("never shrinks past the floor", () => {
    expect(fitFontScale(100, 1000, 0.35)).toBe(0.35);
  });

  it("stays at full size until both sides are measured", () => {
    expect(fitFontScale(0, 400, 0.35)).toBe(1);
    expect(fitFontScale(300, 0, 0.35)).toBe(1);
  });
});
