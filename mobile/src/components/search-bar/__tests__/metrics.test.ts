import {
  SEARCH_BAR_HEIGHT,
  SEARCH_FIELD_PADDING_VERTICAL,
  searchFieldHeight,
} from "../metrics";

/** The input's font size (fontSizes.lg), restated so the test is standalone. */
const INPUT_FONT_SIZE = 16;
/** React Native lays a text line out at roughly 1.2x its font size. */
const LINE_HEIGHT_RATIO = 1.2;

describe("searchFieldHeight", () => {
  it("is the designed 36pt box at the default text size", () => {
    // The whole point of the minHeight swap: nothing moves at scale 1.
    expect(searchFieldHeight(1)).toBe(SEARCH_BAR_HEIGHT);
  });

  it("never shrinks below the 36pt tap target at smaller text sizes", () => {
    expect(searchFieldHeight(0.824)).toBe(SEARCH_BAR_HEIGHT);
    expect(searchFieldHeight(0.941)).toBe(SEARCH_BAR_HEIGHT);
  });

  it("grows with the text so typed characters are not clipped", () => {
    expect(searchFieldHeight(1.235) > SEARCH_BAR_HEIGHT).toBeTruthy();
    expect(searchFieldHeight(2) > searchFieldHeight(1.5)).toBeTruthy();
  });

  it("fits the scaled input line plus its padding at every iOS scale", () => {
    // The failure this fixes: a hard `height: 36` clipped enlarged typed text.
    for (const scale of [1, 1.118, 1.235, 1.35, 1.643, 1.941, 2.35, 3.117]) {
      const needed =
        INPUT_FONT_SIZE * scale * LINE_HEIGHT_RATIO +
        SEARCH_FIELD_PADDING_VERTICAL * 2;
      expect(searchFieldHeight(scale) >= needed).toBeTruthy();
    }
  });

  it("is monotonic, so a larger text size never yields a shorter field", () => {
    let previous = 0;
    for (const scale of [0.8, 1, 1.2, 1.4, 1.8, 2.2, 3.2]) {
      const height = searchFieldHeight(scale);
      expect(height >= previous).toBeTruthy();
      previous = height;
    }
  });

  it("reads an unknown scale as the default box", () => {
    expect(searchFieldHeight(undefined)).toBe(SEARCH_BAR_HEIGHT);
    expect(searchFieldHeight(Number.NaN)).toBe(SEARCH_BAR_HEIGHT);
  });
});
