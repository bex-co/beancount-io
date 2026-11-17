import { describe, it, expect } from "vitest";
import { createEmptyChartOption } from "../utils";

describe("date-balance-chart utils", () => {
  describe("createEmptyChartOption", () => {
    it("should return a chart option object", () => {
      const option = createEmptyChartOption();
      expect(option).toBeDefined();
      expect(typeof option).toBe("object");
    });

    it("should have an empty series", () => {
      const option = createEmptyChartOption();
      expect(option.series).toEqual([]);
    });
  });
});
