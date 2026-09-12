import { chartPageHeight } from "../chart-page-height";

/** The card's own numbers, restated so the test reads as the real case. */
const CHART_HEIGHT = 170;
const PAGE_HEIGHT = 240;

const pageHeight = (headerHeight: number | null) =>
  chartPageHeight(headerHeight, CHART_HEIGHT, PAGE_HEIGHT);

describe("chartPageHeight", () => {
  it("stays at the designed height before the header is measured", () => {
    // The skeleton is sized to PAGE_HEIGHT, so the first painted frame must be
    // the same height or the card jumps when the data lands.
    expect(pageHeight(null)).toBe(PAGE_HEIGHT);
  });

  it("stays at the designed height while the header fits inside it", () => {
    // 240 - 170 = 70pt of header room at the default text size.
    expect(pageHeight(56)).toBe(PAGE_HEIGHT);
    expect(pageHeight(70)).toBe(PAGE_HEIGHT);
  });

  it("grows the page once the wrapped header outgrows that room", () => {
    // The failure: the headline amount wraps at larger text sizes and the plot
    // was clipped by the fixed 240.
    expect(pageHeight(96)).toBe(96 + CHART_HEIGHT);
    expect(pageHeight(150)).toBe(150 + CHART_HEIGHT);
  });

  it("always leaves the full plot height below the header", () => {
    for (const headerHeight of [40, 70, 71, 100, 180, 260]) {
      expect(
        pageHeight(headerHeight) - headerHeight >= CHART_HEIGHT,
      ).toBeTruthy();
    }
  });

  it("rounds up so a fractional measurement never clips a pixel", () => {
    expect(pageHeight(96.4)).toBe(97 + CHART_HEIGHT);
  });

  it("ignores a measurement the platform could not provide", () => {
    expect(pageHeight(0)).toBe(PAGE_HEIGHT);
    expect(pageHeight(Number.NaN)).toBe(PAGE_HEIGHT);
    expect(pageHeight(-10)).toBe(PAGE_HEIGHT);
  });
});
