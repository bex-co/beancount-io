import fs from "fs";
import path from "path";
import { barChartValueDomain } from "../bar-chart-domain";

/**
 * The spending bar chart's value domain. This file used to re-declare the
 * chart's `Math.max`/`Math.min` inline and test d3 against its own copy, so a
 * change to the chart could not fail it; the domain now lives in a module the
 * chart uses and this file imports.
 */
describe("barChartValueDomain", () => {
  it("runs from zero to the largest month when spending is positive", () => {
    expect(barChartValueDomain([10, 25, 15, 30, 20])).toEqual([0, 30]);
  });

  it("keeps zero and reaches below it for negative months", () => {
    expect(barChartValueDomain([100, -50, 75])).toEqual([-50, 100]);
    expect(barChartValueDomain([-10, -25])).toEqual([-25, 1]);
  });

  it("never collapses for an empty or all-zero series", () => {
    expect(barChartValueDomain([])).toEqual([0, 1]);
    expect(barChartValueDomain([0, 0])).toEqual([0, 1]);
  });

  it("is the domain the chart's y scale uses", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "bar-chart-d3.tsx"),
      "utf8",
    );
    expect(source.includes(".domain(barChartValueDomain(numbers))")).toBe(true);
  });
});
