import fs from "fs";
import path from "path";
import { changePercent } from "../d3/change-percent";

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
