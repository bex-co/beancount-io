import fs from "fs";
import path from "path";
import { tabStripHasMoreAfter } from "../tab-strip-overflow";

describe("tabStripHasMoreAfter", () => {
  it("is true while labels run past the trailing edge", () => {
    expect(
      tabStripHasMoreAfter({
        contentWidth: 420,
        viewportWidth: 300,
        offset: 0,
      }),
    ).toBe(true);
    expect(
      tabStripHasMoreAfter({
        contentWidth: 420,
        viewportWidth: 300,
        offset: 60,
      }),
    ).toBe(true);
  });

  it("is false once scrolled to the end, or when every tab fits", () => {
    expect(
      tabStripHasMoreAfter({
        contentWidth: 420,
        viewportWidth: 300,
        offset: 120,
      }),
    ).toBe(false);
    expect(
      tabStripHasMoreAfter({
        contentWidth: 260,
        viewportWidth: 300,
        offset: 0,
      }),
    ).toBe(false);
  });

  it("is false before the strip has been measured", () => {
    expect(
      tabStripHasMoreAfter({ contentWidth: 420, viewportWidth: 0, offset: 0 }),
    ).toBe(false);
  });
});

describe("SegmentedPages tab strip", () => {
  it("draws the trailing fade from the measured overflow", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "index.tsx"),
      "utf8",
    );
    expect(source.includes("{tabStripHasMoreAfter(strip) ? (")).toBe(true);
    expect(source.includes("scrollEnabled={false}")).toBe(true);
  });
});
