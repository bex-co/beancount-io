import fs from "fs";
import path from "path";
import {
  tabStripHasMoreAfter,
  trailingNeedsOwnRow,
} from "../tab-strip-overflow";

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

describe("trailingNeedsOwnRow", () => {
  // Widths observed on a 390-point iPhone: the Home card's header row is 358
  // points wide.
  it("keeps See all beside tabs at default size, in English and German", () => {
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 84,
        tabsContentWidth: 300,
        widestTabWidth: 100,
      }),
    ).toBe(false);
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 120,
        tabsContentWidth: 420,
        widestTabWidth: 160,
      }),
    ).toBe(false);
  });

  it("moves an enlarged translated action off a sliver of tabs", () => {
    // German at the largest accessibility size left the tabs 38.67 points.
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 319.33,
        tabsContentWidth: 1180,
        widestTabWidth: 439,
      }),
    ).toBe(true);
  });

  it("moves the action when the widest tab would no longer fit whole", () => {
    // English at maximum: 183 points remain, but "Net Worth" needs about 300.
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 175,
        tabsContentWidth: 900,
        widestTabWidth: 300,
      }),
    ).toBe(true);
  });

  it("never asks for more room than labels that already fit", () => {
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 230,
        tabsContentWidth: 110,
        widestTabWidth: 50,
      }),
    ).toBe(false);
  });

  it("waits for both widths before deciding", () => {
    expect(
      trailingNeedsOwnRow({
        rowWidth: 0,
        trailingWidth: 319,
        tabsContentWidth: 0,
        widestTabWidth: 0,
      }),
    ).toBe(false);
    expect(
      trailingNeedsOwnRow({
        rowWidth: 358,
        trailingWidth: 0,
        tabsContentWidth: 900,
        widestTabWidth: 300,
      }),
    ).toBe(false);
  });
});
