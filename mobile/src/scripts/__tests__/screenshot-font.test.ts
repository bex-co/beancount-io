import { screenshotFont } from "../screenshot-font";

describe("Screenshot font coverage", () => {
  it("preserves Arial Unicode output when that font is installed", () => {
    expect(
      screenshotFont("  Font: Arial\n  Font: Arial-Unicode-MS\n", "zh"),
    ).toEqual({ name: "Arial-Unicode-MS", family: "Arial Unicode MS" });
  });

  it("uses available macOS fonts for Chinese and Cyrillic without Arial Unicode", () => {
    const available = "  Font: Arial\n  Font: Heiti-SC-Medium\n";
    expect(screenshotFont(available, "zh")).toEqual({
      name: "Heiti-SC-Medium",
      family: "Heiti SC",
    });
    expect(screenshotFont(available, "bg")).toEqual({
      name: "Arial",
      family: "Arial",
    });
  });

  it("refuses missing glyph coverage instead of using a Latin font for Chinese", () => {
    expect(() =>
      screenshotFont("  Font: Arial\n  Font: Arial-Unicode-MS-Bold\n", "zh"),
    ).toThrow();
  });
});
