import { axisLabelWidth } from "../axis-label-width";
import { formatShortMoneyWithCurrency } from "../../number-utils";

describe("report axis currency labels", () => {
  it("keeps ordinary USD ticks at their existing width", () => {
    const labels = [-200, 0, 200].map((tick) =>
      formatShortMoneyWithCurrency(tick, "USD"),
    );
    expect(axisLabelWidth(labels, 12, 50)).toBe(50);
  });
  it("reserves space for MiniMax's negative MUSD ticks instead of clipping their sign and amount", () => {
    const labels = [-200, 0, 200].map((tick) =>
      formatShortMoneyWithCurrency(tick, "MUSD"),
    );
    expect(labels[0]).toBe("-200 MUSD");
    expect(axisLabelWidth(labels, 12, 50) >= 80).toBe(true);
  });
});
