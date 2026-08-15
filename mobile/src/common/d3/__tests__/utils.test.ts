import { CURVE_LENGTH_SLACK, generateTicks, polylineLength } from "../utils";

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

describe("generateTicks", () => {
  it("generates evenly spaced ticks between min and max", () => {
    const result = generateTicks(0, 100, 5);
    expect(result).toEqual([0, 25, 50, 75, 100]);
  });

  it("handles negative ranges", () => {
    const result = generateTicks(-100, 0, 5);
    expect(result).toEqual([-100, -75, -50, -25, 0]);
  });

  it("handles ranges crossing zero", () => {
    const result = generateTicks(-50, 50, 5);
    expect(result).toEqual([-50, -25, 0, 25, 50]);
  });

  it("generates single tick when count is 1", () => {
    const result = generateTicks(0, 100, 1);
    expect(result).toEqual([0]);
  });

  it("generates two ticks for count of 2", () => {
    const result = generateTicks(0, 100, 2);
    expect(result).toEqual([0, 100]);
  });

  it("handles decimal values", () => {
    const result = generateTicks(0, 1, 3);
    expect(result).toEqual([0, 0.5, 1]);
  });

  it("handles same min and max values", () => {
    const result = generateTicks(50, 50, 5);
    expect(result).toEqual([50, 50, 50, 50, 50]);
  });

  it("handles reversed range (max less than min)", () => {
    const result = generateTicks(100, 0, 5);
    expect(result).toEqual([100, 75, 50, 25, 0]);
  });

  it("handles large ranges", () => {
    const result = generateTicks(0, 1000000, 3);
    expect(result).toEqual([0, 500000, 1000000]);
  });

  it("handles very small ranges", () => {
    const result = generateTicks(0, 0.001, 3);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0.0005);
    expect(result[2]).toBeCloseTo(0.001);
  });

  it("generates correct number of ticks", () => {
    const count = 10;
    const result = generateTicks(0, 100, count);
    expect(result.length).toBe(count);
  });

  it("handles negative to positive range with many ticks", () => {
    const result = generateTicks(-100, 100, 9);
    expect(result).toEqual([-100, -75, -50, -25, 0, 25, 50, 75, 100]);
  });

  it("handles zero count gracefully", () => {
    const result = generateTicks(0, 100, 0);
    expect(result.length).toBe(0);
  });

  it("handles negative count gracefully", () => {
    const result = generateTicks(0, 100, -5);
    expect(result.length).toBe(0);
  });

  it("handles fractional step values", () => {
    const result = generateTicks(0, 3, 4);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(1);
    expect(result[2]).toBeCloseTo(2);
    expect(result[3]).toBeCloseTo(3);
  });
});
