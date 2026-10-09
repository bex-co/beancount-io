import fs from "fs";
import path from "path";
import { SCRUB_IDLE, scrubTrendUp } from "../scrub";

/**
 * The scrubbed chart colour must agree with the change row: both measure from
 * the period's *opening* balance, not from the first plotted close. On an ALL
 * window that opens at zero, a negative first point read green because it was
 * compared with itself (Alibaba Liabilities, −630,123 MRMB).
 */

// Mirrors the chart's scale: the domain spans only the plotted values (padded
// by 10%), the range runs bottom → top, so larger values sit at smaller y.
// The opening balance goes through the same projection and may land outside
// the plot, exactly as `paths.yFor(baseline)` does.
const HEIGHT = 200;
function project(values: number[], opening: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const y = (v: number) => HEIGHT - ((v - lo) / (hi - lo)) * HEIGHT;
  return { pointYs: values.map(y), openingY: y(opening) };
}

function trendAt(values: number[], opening: number, index: number) {
  const { pointYs, openingY } = project(values, opening);
  return scrubTrendUp(index, pointYs, openingY);
}

const LIABILITIES_ALL = [-630123, -652230, -714121, -783300, -848215];
const ASSETS_ALL = [1753044, 1800000, 1900000];

test("a negative first point on a zero-opening window reads down", () => {
  expect(trendAt(LIABILITIES_ALL, 0, 0)).toBe(false);
  expect(trendAt(LIABILITIES_ALL, 0, 3)).toBe(false);
});

test("a positive first point on a zero-opening window reads up", () => {
  expect(trendAt(ASSETS_ALL, 0, 0)).toBe(true);
});

test("a prior-month opening balance is the baseline, not the first close", () => {
  // Six-month window: opens at the prior close, first plotted March is lower.
  const window = [-783300, -800000, -848215];
  expect(trendAt(window, -714121, 0)).toBe(false);
  // A first close above a lower opening reads up even though later points
  // fall below that first close.
  const rising = [120, 90, 105];
  expect(trendAt(rising, 100, 0)).toBe(true);
  expect(trendAt(rising, 100, 1)).toBe(false);
  expect(trendAt(rising, 100, 2)).toBe(true);
});

test("a point equal to the opening balance reads up, like a zero change", () => {
  expect(trendAt([50, 80, 30], 50, 0)).toBe(true);
  expect(trendAt([-10, -20], -10, 0)).toBe(true);
});

test("no finger down defers to the resting direction", () => {
  expect(trendAt(LIABILITIES_ALL, 0, SCRUB_IDLE)).toBe(null);
  expect(scrubTrendUp(0, [], 0)).toBe(null);
});

test("a stale index past a shorter series clamps to its last point", () => {
  expect(trendAt([10, 5, 30], 20, 9)).toBe(true);
  expect(trendAt([10, 25, 15], 20, 9)).toBe(false);
});

test("the chart feeds the scrub the projected opening balance", () => {
  const chart = fs.readFileSync(
    path.join(__dirname, "..", "interactive-line-chart.tsx"),
    "utf8",
  );
  expect(chart.includes("openingY: paths.yFor(baseline)")).toBe(true);
  expect(chart.includes("scrubTrendUp(scrub.value, pointYs, openingY)")).toBe(
    true,
  );
});
