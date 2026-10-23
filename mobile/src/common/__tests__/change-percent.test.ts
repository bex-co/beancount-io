import fs from "fs";
import path from "path";
import { changePercent, formatChangePercent } from "../d3/change-percent";

const pct = (baseline: number, value: number) =>
  changePercent(baseline, value)?.toFixed(2) ?? null;

describe("changePercent", () => {
  it("measures a rise or fall between two positive values", () => {
    expect(pct(251635, 640480)).toBe("154.53");
    expect(pct(200, 150)).toBe("-25.00");
    expect(pct(100, 0)).toBe("-100.00");
  });

  it("measures a negative balance against its magnitude", () => {
    expect(pct(-1000, -500)).toBe("50.00");
    expect(pct(-500, -1000)).toBe("-100.00");
    expect(pct(-100, 0)).toBe("100.00");
  });

  it("has no percentage across a sign flip", () => {
    expect(pct(-76.38, 1346.68)).toBe(null);
    expect(pct(-1512.42, 5317.06)).toBe(null);
    expect(pct(250, -40)).toBe(null);
  });

  it("has no percentage from a zero start", () => {
    expect(pct(0, 5317.06)).toBe(null);
    expect(pct(0, 0)).toBe(null);
  });
});

describe("balance chart change row", () => {
  it("formats the change through changePercent, not a raw ratio", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "d3", "interactive-line-chart.tsx"),
      "utf8",
    );
    expect(source.includes("changePercent(baseline, shownValue)")).toBe(true);
    expect(source.includes("Math.abs(baseline)")).toBe(false);
  });
});

// w21/237: the percentage took its sign from the raw change and could print
// "-0.00%", beside an amount that already followed the rounded value.
describe("formatChangePercent", () => {
  const row = (baseline: number, value: number) => {
    const pct = changePercent(baseline, value);
    return pct === null ? null : formatChangePercent(pct);
  };

  it("reads a large balance's small drop as flat, not as -0.00%", () => {
    // 2,500,000 to 2,499,988: -$12.00 (0.00%).
    expect(row(2_500_000, 2_499_988)).toEqual({ text: "0.00%", flat: true });
  });

  it("reads a sub-cent move as flat, without a stray sign", () => {
    // 10234.567891 to 10234.565.
    expect(row(10234.567891, 10234.565)).toEqual({ text: "0.00%", flat: true });
    expect(row(10234.565, 10234.567891)).toEqual({ text: "0.00%", flat: true });
  });

  it("signs the rounded value", () => {
    expect(formatChangePercent(12.345)).toEqual({
      text: "+12.35%",
      flat: false,
    });
    expect(formatChangePercent(-3.2)).toEqual({ text: "-3.20%", flat: false });
    expect(formatChangePercent(0.004)).toEqual({ text: "0.00%", flat: true });
    expect(formatChangePercent(-0.004)).toEqual({ text: "0.00%", flat: true });
    expect(formatChangePercent(0.006)).toEqual({ text: "+0.01%", flat: false });
    expect(formatChangePercent(-0.006)).toEqual({
      text: "-0.01%",
      flat: false,
    });
  });
});

describe("the change row", () => {
  it("shows the rounded percentage and reads a flat change in the neutral colour", () => {
    const chart = fs
      .readFileSync(
        path.join(__dirname, "..", "d3", "interactive-line-chart.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(chart.includes("formatChangePercent(changePct)")).toBe(true);
    // The colour follows `describeChange`, which defers to the percentage when
    // there is one (w21/416).
    expect(chart.includes("changeFlat?neutralColor:color")).toBe(true);
    // No percentage is built from the raw change any more.
    expect(chart.includes('change>=0?"+":""')).toBe(false);
  });
});

// w21/416: a change of exactly zero from a zero baseline has no percentage, and
// "+$0.00" was drawn in the gain colour.
describe("describeChange", () => {
  const { describeChange } = require("../d3/change-percent");
  const { formatSignedMoneyWithCurrency } = require("../number-utils");
  const money = (value: number, includePlus?: boolean) =>
    formatSignedMoneyWithCurrency(value, "USD", includePlus);

  it("reads a zero change from a zero baseline as flat and unsigned", () => {
    expect(describeChange(0, null, money)).toEqual({
      amount: "$0.00",
      flat: true,
    });
  });

  it("reads a change that rounds to nothing as flat, with or without a percentage", () => {
    expect(describeChange(0.001, null, money)).toEqual({
      amount: "$0.00",
      flat: true,
    });
    expect(describeChange(-0.002, null, money).flat).toBe(true);
    // The percentage's own verdict stands when there is one.
    expect(describeChange(5, { flat: true }, money).flat).toBe(true);
    expect(describeChange(0, { flat: false }, money).flat).toBe(false);
  });

  it("keeps a real change signed and in colour", () => {
    expect(describeChange(1904.4, null, money)).toEqual({
      amount: "+$1,904.40",
      flat: false,
    });
    expect(describeChange(-12, null, money)).toEqual({
      amount: "-$12.00",
      flat: false,
    });
  });

  it("is what the change row uses for its colour and text", () => {
    const src = require("fs")
      .readFileSync(
        require("path").join(__dirname, "../d3/interactive-line-chart.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      src.includes(
        "const{amount:changeAmount,flat:changeFlat}=describeChange(change,shownPct,format,);",
      ),
    ).toBe(true);
    expect(src.includes("{color:changeFlat?neutralColor:color}")).toBe(true);
  });
});

// w21/750: the change row read a flat range grey while the line and its fill
// stayed green, or red for w21/237's near-flat drop.
describe("changeReadsFlat", () => {
  const { changeReadsFlat } = require("../d3/change-percent");
  const { formatSignedMoneyWithCurrency } = require("../number-utils");
  const money = (value: number, includePlus?: boolean) =>
    formatSignedMoneyWithCurrency(value, "USD", includePlus);

  it("is flat for an unmoved range and one that rounds to nothing", () => {
    expect(changeReadsFlat(-8000, -8000, money)).toBe(true);
    expect(changeReadsFlat(2500000, 2499988, money)).toBe(true);
    expect(changeReadsFlat(0, 0.001, money)).toBe(true);
  });

  it("keeps a real move coloured", () => {
    expect(changeReadsFlat(251635, 640480, money)).toBe(false);
    expect(changeReadsFlat(200, 150, money)).toBe(false);
  });

  it("is what the chart's line colour follows at rest", () => {
    const chart = fs
      .readFileSync(
        path.join(__dirname, "..", "d3", "interactive-line-chart.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      chart.includes(
        "neutral||(scrubFavorable===null&&restingFlat)?theme.black80",
      ),
    ).toBe(true);
    expect(chart.includes("constrestingFlat=changeReadsFlat(")).toBe(true);
  });
});
