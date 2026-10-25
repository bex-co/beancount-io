import fs from "fs";
import path from "path";
import { budgetColumnWidth } from "../budget-chart-columns";

// w21/220: the plot was sized from the screen, 32 pt wider than the chart's
// viewport, so scrolling to the end hid the first bar and clipped its label.
describe("budgetColumnWidth", () => {
  it("fits four periods into the measured width, minus the axis", () => {
    // A 390 pt screen: the list and the card each take a 16 pt gutter per
    // side, leaving 326 pt; the 50 pt axis leaves 276 for four columns.
    const measured = 390 - 4 * 16;
    expect(budgetColumnWidth(measured, 50, 4, 44)).toBe(69);
    // The plot never exceeds the viewport, so nothing scrolls or is cut off.
    expect(budgetColumnWidth(measured, 50, 4, 44) * 4 <= measured - 50).toBe(
      true,
    );
  });

  it("sized from the screen, the same plot overflowed by 32 pt", () => {
    const fromScreen = (390 - 2 * 16 - 50) / 4;
    const measured = 390 - 4 * 16;
    expect((fromScreen - budgetColumnWidth(measured, 50, 4, 44)) * 4).toBe(32);
  });

  it("keeps columns readable and lets a long span scroll", () => {
    expect(budgetColumnWidth(326, 50, 12, 44)).toBe(44);
    expect(budgetColumnWidth(326, 50, 0, 44)).toBe(44);
  });
});

describe("the budget chart's width", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("is measured from its own layout, not derived from the screen", () => {
    const chart = read("budget-bar-chart-d3.tsx");
    // w21/1004: the inline measure moved into the shared `useChartWidth`
    // hook, which still measures this chart's own container.
    expect(chart.includes("useChartWidth(")).toBe(true);
    expect(chart.includes("onLayout={onLayout}")).toBe(true);
    expect(chart.includes("budgetColumnWidth(")).toBe(true);
    expect(chart.includes("availableWidth")).toBe(false);
  });

  it("pads the account balance chart by the width it was sized for", () => {
    const screen = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "..",
          "screens",
          "account-detail-screen",
          "account-detail-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes("chartContainer:{")).toBe(true);
    expect(screen.includes("paddingHorizontal:contentPadding,")).toBe(true);
  });
});
