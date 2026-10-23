import fs from "fs";
import path from "path";
import { SCRUB_IDLE, scrubTrendFavorable, trendFavorable } from "../scrub";

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

function trendAt(
  values: number[],
  opening: number,
  index: number,
  netWorthSign: 1 | -1 = 1,
) {
  const { pointYs, openingY } = project(values, opening);
  return scrubTrendFavorable(index, pointYs, openingY, netWorthSign);
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
  expect(scrubTrendFavorable(0, [], 0, 1)).toBe(null);
  expect(scrubTrendFavorable(0, [], 0, -1)).toBe(null);
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
  expect(
    chart
      .replace(/\s+/g, "")
      .includes(
        "scrubTrendFavorable(scrub.value,pointYs,openingY,netWorthSign,flatPoints,)",
      ),
  ).toBe(true);
});

// w21/820: a flat series turned green under a finger while its change row read
// a grey "+$0.00 (0.00%)".
describe("scrubbing a series whose change reads flat", () => {
  const { changeReadsFlat } = require("../change-percent");
  const dollars = (value: number, includePlus = false) =>
    `${value < 0 ? "-" : includePlus ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
  const flatAt = (values: number[], baseline: number) =>
    values.map((value) => changeReadsFlat(baseline, value, dollars));

  it("keeps the line neutral at a flat point", () => {
    const values = [17108.51, 17108.51];
    const { pointYs, openingY } = project(values, 17108.51);
    const flat = flatAt(values, 17108.51);
    expect(flat).toEqual([true, true]);
    for (const index of [0, 1]) {
      expect(scrubTrendFavorable(index, pointYs, openingY, 1, flat)).toBe(
        "flat",
      );
    }
    // A near-flat drop that rounds to "-0.00%" too (w21/237).
    const drop = [2500000, 2499988];
    const dropped = project(drop, 2500000);
    expect(
      scrubTrendFavorable(
        1,
        dropped.pointYs,
        dropped.openingY,
        1,
        flatAt(drop, 2500000),
      ),
    ).toBe("flat");
  });

  it("still colours a real change", () => {
    const values = [1000, 1250];
    const { pointYs, openingY } = project(values, 1000);
    expect(
      scrubTrendFavorable(1, pointYs, openingY, 1, flatAt(values, 1000)),
    ).toBe(true);
    // At rest it is the resting colour's to say.
    expect(
      scrubTrendFavorable(SCRUB_IDLE, pointYs, openingY, 1, [true, true]),
    ).toBe(null);
  });

  it("is what the line is drawn by", () => {
    const chart = fs
      .readFileSync(
        path.join(__dirname, "..", "interactive-line-chart.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      chart.includes(
        'neutral||(scrubFavorable===null?restingFlat:scrubFavorable==="flat")',
      ),
    ).toBe(true);
    expect(
      chart.includes(
        "numbers.map((value)=>changeReadsFlat(baseline,value,a11yFormat))",
      ),
    ).toBe(true);
  });
});

// Income, Expenses and Equity mirror net worth: an Expenses balance rising
// is spending, an Income balance falling is earning (w0/033).
const EXPENSES_6M = [212663, 225000, 240000, 254609];
const INCOME_6M = [-296528, -320000, -340000, -357944];

test("a rising Expenses balance reads unfavorable", () => {
  expect(trendAt(EXPENSES_6M, 212663, 3, -1)).toBe(false);
  expect(trendFavorable(254609, 212663, -1)).toBe(false);
});

test("a falling Income balance reads favorable", () => {
  expect(trendAt(INCOME_6M, -296528, 3, -1)).toBe(true);
  expect(trendFavorable(-357944, -296528, -1)).toBe(true);
});

test("a refunded expense below the opening balance reads favorable", () => {
  expect(trendAt([100, 60], 100, 1, -1)).toBe(true);
});

test("an unchanged balance reads favorable whichever way the category runs", () => {
  for (const sign of [1, -1] as const) {
    expect(trendFavorable(50, 50, sign)).toBe(true);
    expect(trendAt([50, 80, 50], 50, 2, sign)).toBe(true);
  }
});

test("Assets and Liabilities keep reading by direction", () => {
  expect(trendFavorable(120, 100, 1)).toBe(true);
  expect(trendFavorable(-848215, -630123, 1)).toBe(false);
});
