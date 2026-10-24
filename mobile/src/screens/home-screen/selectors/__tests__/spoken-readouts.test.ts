import {
  roundMoney,
  formatShortMoneyWithCurrency,
} from "../../../../common/number-utils";
import { spokenPercent } from "../select-budget-panel";
import fs from "fs";
import path from "path";

// w21/597: VoiceOver read "net -$0.0000000000000036" for a chart whose months
// net to zero, and "100% used" for $497.60 and for $502.00 of a $500 budget.
describe("the Reports chart's spoken net", () => {
  it("settles the sum of monthly nets at money precision", () => {
    const net = [10.1, 20.2, -30.3].reduce((sum, value) => sum + value, 0);
    expect(net === 0).toBe(false);
    expect(roundMoney(net, "USD")).toBe(0);
    expect(formatShortMoneyWithCurrency(roundMoney(net, "USD"), "USD")).toBe(
      "$0",
    );
  });

  it("rounds a fiat sum to its minor unit and a commodity to eight places", () => {
    expect(roundMoney(0.1 + 0.2, "USD")).toBe(0.3);
    expect(roundMoney(1234.5678, "JPY")).toBe(1235);
    expect(roundMoney(0.1 + 0.2, "BTC")).toBe(0.3);
    expect(roundMoney(-1e-15, "USD")).toBe(0);
    expect(Object.is(roundMoney(-1e-15, "USD"), -0)).toBe(false);
  });

  it("is what the chart's summary uses for income, expense and net", () => {
    const chart = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "common",
          "d3",
          "income-expense-bar-chart.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    for (const series of ["income", "expense", "net"]) {
      expect(
        chart.includes(
          `${series}:formatSignedMoneyWithCurrency(roundMoney(${series}.reduce((sum,v)=>sum+v,0),currency,),currency,)`,
        ),
      ).toBe(true);
    }
  });
});

describe("a budget row's spoken percent", () => {
  it("is under 100 when under target and over 100 when over", () => {
    // $497.60 of $500 and $502.00 of $500.
    expect(spokenPercent((497.6 / 500) * 100)).toBe(99);
    expect(spokenPercent((502 / 500) * 100)).toBe(101);
  });

  it("says exactly 100 only at the budget, float noise aside", () => {
    expect(spokenPercent(100)).toBe(100);
    expect(spokenPercent(100.00000000000001)).toBe(100);
    expect(spokenPercent(99.99999999999999)).toBe(100);
  });

  it("is '<1' for a small spend, which is read as less than one percent", () => {
    expect(spokenPercent((2 / 500) * 100)).toBe("<1");
    expect(spokenPercent(0)).toBe(0);
  });

  it("rounds an ordinary share down", () => {
    expect(spokenPercent(73.4166)).toBe(73);
    expect(spokenPercent(80)).toBe(80);
  });
});
