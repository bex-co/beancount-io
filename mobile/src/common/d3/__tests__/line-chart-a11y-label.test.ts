import fs from "fs";
import path from "path";

// w21/499: Home passed `label` so VoiceOver named each curve, but `label` is
// also drawn, giving a visible second "Net Worth" under the Net Worth tab.
const read = (...parts: string[]) =>
  fs
    .readFileSync(path.join(__dirname, "../../..", ...parts), "utf8")
    .replace(/\s+/g, "");

describe("a chart named only to a screen reader", () => {
  it("Home names its curves with a11yLabel, which draws nothing", () => {
    const card = read("screens/home-screen/components/account-charts-card.tsx");
    expect(card.includes("a11yLabel={t(key)}")).toBe(true);
    expect(card.includes("label={t(key)}")).toBe(false);
  });

  it("the chart feeds a11yLabel to the summary but only draws label", () => {
    const chart = read("common/d3/interactive-line-chart.tsx");
    expect(
      chart.includes("chartSummaryLabel(label??a11yLabel,a11ySeries)"),
    ).toBe(true);
    expect(
      chart.includes(
        "{label!==undefined&&(<Textkey={`label-${fontScale}`}style={styles.label}>",
      ),
    ).toBe(true);
    expect(chart.includes("style={styles.label}>{a11yLabel}")).toBe(false);
  });
});
