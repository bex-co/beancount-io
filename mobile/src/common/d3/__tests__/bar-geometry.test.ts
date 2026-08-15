import { barGrowsUp, barRectAt } from "../bar-geometry";

// A plot whose value-zero line sits 100px down from the top of the SVG.
const BASELINE = 100;

test("a bar above the baseline grows upward", () => {
  expect(barGrowsUp(60, BASELINE)).toBe(true);
});

test("a bar starting on the baseline grows downward", () => {
  expect(barGrowsUp(BASELINE, BASELINE)).toBe(false);
});

test("every bar starts flat on the baseline", () => {
  // Nothing may be visible before its slice of the sweep begins, in either
  // direction.
  expect(barRectAt(60, 40, BASELINE, 0)).toEqual({ y: BASELINE, height: 0 });
  expect(barRectAt(BASELINE, 40, BASELINE, 0)).toEqual({
    y: BASELINE,
    height: 0,
  });
});

test("a positive bar lands exactly on its resting rectangle", () => {
  expect(barRectAt(60, 40, BASELINE, 1)).toEqual({ y: 60, height: 40 });
});

test("a negative bar lands exactly on its resting rectangle", () => {
  // Below the baseline the top edge stays pinned and only the height extends.
  expect(barRectAt(BASELINE, 40, BASELINE, 1)).toEqual({
    y: BASELINE,
    height: 40,
  });
});

test("a positive bar's bottom edge stays welded to the baseline", () => {
  // y + height must equal the baseline at every point in the growth, or the
  // bar visibly detaches from the zero line as it rises.
  [0, 0.25, 0.5, 0.75, 1].forEach((progress) => {
    const rect = barRectAt(60, 40, BASELINE, progress);
    expect(rect.y + rect.height).toBeCloseTo(BASELINE);
  });
});

test("a negative bar's top edge stays welded to the baseline", () => {
  [0, 0.25, 0.5, 0.75, 1].forEach((progress) => {
    expect(barRectAt(BASELINE, 40, BASELINE, progress).y).toBe(BASELINE);
  });
});

test("a bar never crosses zero partway through its growth", () => {
  // The direction is fixed by the resting geometry, so a growing positive bar
  // stays entirely above the baseline and a negative one entirely below.
  [0, 0.3, 0.6, 1].forEach((progress) => {
    const up = barRectAt(60, 40, BASELINE, progress);
    expect(up.y <= BASELINE).toBe(true);

    const down = barRectAt(BASELINE, 40, BASELINE, progress);
    expect(down.y + down.height >= BASELINE).toBe(true);
  });
});

test("height grows monotonically with progress", () => {
  let previous = -1;
  [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((progress) => {
    const { height } = barRectAt(60, 40, BASELINE, progress);
    expect(height >= previous).toBe(true);
    previous = height;
  });
});

test("a minimum-height sliver still grows in its own direction", () => {
  // Near-zero months are clamped to a 2px sliver by the charts. It must not
  // invert, and it must still animate rather than popping in.
  const up = barRectAt(BASELINE - 2, 2, BASELINE, 0.5);
  expect(up.height).toBe(1);
  expect(up.y).toBe(BASELINE - 1);

  const down = barRectAt(BASELINE, 2, BASELINE, 0.5);
  expect(down.height).toBe(1);
  expect(down.y).toBe(BASELINE);
});

test("a zero-height bar stays collapsed on the baseline", () => {
  expect(barRectAt(BASELINE, 0, BASELINE, 1)).toEqual({
    y: BASELINE,
    height: 0,
  });
});
