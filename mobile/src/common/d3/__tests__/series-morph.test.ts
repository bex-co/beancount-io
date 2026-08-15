import { lerp, lerpSeries, resampleSeries, sameSeries } from "../series-morph";

test("lerp walks from one value to the other", () => {
  expect(lerp(0, 10, 0)).toBe(0);
  expect(lerp(0, 10, 1)).toBe(10);
  expect(lerp(0, 10, 0.25)).toBe(2.5);
  expect(lerp(-4, 4, 0.5)).toBe(0);
});

test("resampling to the same length returns the original points", () => {
  // The endpoints of a morph must be the real series, or the transition would
  // start and end somewhere other than what the chart draws at rest.
  expect(resampleSeries([1, 2, 3], 3)).toEqual([1, 2, 3]);
});

test("resampling up interpolates between neighbours", () => {
  expect(resampleSeries([0, 10], 3)).toEqual([0, 5, 10]);
  expect(resampleSeries([0, 10, 20], 5)).toEqual([0, 5, 10, 15, 20]);
});

test("resampling down keeps the first and last points exactly", () => {
  const down = resampleSeries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
  expect(down.length).toBe(4);
  expect(down[0]).toBe(0);
  expect(down[3]).toBe(9);
});

test("a single-point series is held flat across the grid", () => {
  // A one-month ledger is a real case, and it must not produce NaNs mid-morph.
  expect(resampleSeries([7], 4)).toEqual([7, 7, 7, 7]);
});

test("degenerate resample requests return empty rather than throwing", () => {
  expect(resampleSeries([1, 2, 3], 1)).toEqual([]);
  expect(resampleSeries([1, 2, 3], 0)).toEqual([]);
  expect(resampleSeries([], 5)).toEqual([]);
});

test("resampled values stay within the original range", () => {
  const source = [3, -2, 8, 0, 5];
  const out = resampleSeries(source, 17);
  const min = Math.min(...source);
  const max = Math.max(...source);
  out.forEach((value) => {
    expect(value >= min && value <= max).toBe(true);
  });
});

test("blending at the endpoints yields each series unchanged", () => {
  const from = [1, 2, 3];
  const to = [4, 5, 6];
  expect(lerpSeries(from, to, 0)).toEqual(from);
  expect(lerpSeries(from, to, 1)).toEqual(to);
});

test("blending halfway averages each point", () => {
  expect(lerpSeries([0, 10, 20], [10, 20, 30], 0.5)).toEqual([5, 15, 25]);
});

test("a mismatched blend falls back to the target rather than truncating", () => {
  // Callers resample first; if one ever forgets, drawing the destination is
  // far better than silently rendering a half-length curve.
  expect(lerpSeries([1, 2], [7, 8, 9], 0.5)).toEqual([7, 8, 9]);
});

test("sameSeries distinguishes an equal copy from a real change", () => {
  // Re-renders hand back equal-but-new arrays constantly; treating those as a
  // change would restart the transition on every scrub tick.
  expect(sameSeries([1, 2, 3], [1, 2, 3])).toBe(true);
  expect(sameSeries([1, 2, 3], [1, 2, 4])).toBe(false);
  expect(sameSeries([1, 2, 3], [1, 2])).toBe(false);
  expect(sameSeries([], [])).toBe(true);
});
