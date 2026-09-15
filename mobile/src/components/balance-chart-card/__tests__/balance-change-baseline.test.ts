import fs from "fs";
import path from "path";

/**
 * Static guardrail: both balance cards measure their change from the balance
 * when the window opened, not from the first plotted month. A monthly point
 * is a closing balance, so using it dropped that month's activity: a dormant
 * account funded this month read +$6,829.48 (+451.56%) instead of +$5,317.06.
 */
const SRC = path.join(__dirname, "..", "..", "..");
const read = (file: string) => fs.readFileSync(path.join(SRC, file), "utf8");

describe("balance card change baseline", () => {
  for (const card of [
    "components/balance-chart-card/index.tsx",
    "screens/home-screen/components/account-charts-card.tsx",
  ]) {
    it(`${card} passes the window's opening balance to the chart`, () => {
      expect(
        read(card).includes("baseline={balanceSeriesBaseline(series, range)}"),
      ).toBe(true);
    });
  }

  it("the chart's change row and trend colour both measure from it", () => {
    const chart = read("common/d3/interactive-line-chart.tsx");
    expect(
      chart.split("const baseline = windowBaseline ?? numbers[0] ?? 0;")
        .length - 1,
    ).toBe(2);
  });
});
