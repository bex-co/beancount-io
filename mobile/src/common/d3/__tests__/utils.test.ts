import { CURVE_LENGTH_SLACK, polylineLength } from "../utils";

describe("polylineLength", () => {
  it("measures a straight horizontal run", () => {
    expect(polylineLength([0, 30], [10, 10])).toBeCloseTo(
      30 * CURVE_LENGTH_SLACK,
    );
  });

  it("measures a 3-4-5 triangle's hypotenuse", () => {
    expect(polylineLength([0, 3], [0, 4])).toBeCloseTo(5 * CURVE_LENGTH_SLACK);
  });

  it("sums consecutive segments", () => {
    // Three unit steps right, then one straight down: 3 + 1.
    expect(polylineLength([0, 1, 2, 3, 3], [0, 0, 0, 0, 1])).toBeCloseTo(
      4 * CURVE_LENGTH_SLACK,
    );
  });

  it("adds diagonal segments by their true distance, not their run", () => {
    // Two unit steps right and a diagonal: 1 + 1 + sqrt(2).
    expect(polylineLength([0, 1, 2, 3], [0, 0, 0, 1])).toBeCloseTo(
      (2 + Math.SQRT2) * CURVE_LENGTH_SLACK,
    );
  });

  it("counts a zero-length segment as nothing", () => {
    // Duplicate points appear whenever two months carry the same balance.
    expect(polylineLength([0, 5, 5, 10], [0, 0, 0, 0])).toBeCloseTo(
      10 * CURVE_LENGTH_SLACK,
    );
  });

  it("returns zero for a series too short to draw", () => {
    expect(polylineLength([], [])).toBe(0);
    expect(polylineLength([5], [5])).toBe(0);
  });

  it("stops at the shorter of the two coordinate arrays", () => {
    // Never read past the end of either array and produce NaN.
    expect(polylineLength([0, 1, 2], [0, 0])).toBeCloseTo(
      1 * CURVE_LENGTH_SLACK,
    );
  });

  it("over-estimates rather than under-estimates the drawn curve", () => {
    // The charts draw a monotone cubic, which bows past the straight chords.
    // An under-estimate would leave the tail of the line permanently undrawn,
    // so the slack must always round the estimate up.
    expect(CURVE_LENGTH_SLACK > 1).toBe(true);
    const chords = 30;
    expect(polylineLength([0, chords], [0, 0]) > chords).toBe(true);
  });
});
