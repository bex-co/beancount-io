import { describe, it, expect } from "vitest";
import {
  formatYAxisNumber,
  formatDateAxis,
  type ChartInterval,
} from "../chart";

describe("Chart Utils", () => {
  describe("formatYAxisNumber", () => {
    it("should format large numbers with 'k' suffix", () => {
      expect(formatYAxisNumber(1000)).toBe("1.0k");
      expect(formatYAxisNumber(5000)).toBe("5.0k");
      expect(formatYAxisNumber(12500)).toBe("12.5k");
    });

    it("should format millions with 'm' suffix", () => {
      expect(formatYAxisNumber(1000000)).toBe("1.0m");
      expect(formatYAxisNumber(5000000)).toBe("5.0m");
      expect(formatYAxisNumber(12500000)).toBe("12.5m");
    });

    it("should format billions with 'b' suffix", () => {
      expect(formatYAxisNumber(1000000000)).toBe("1.0b");
      expect(formatYAxisNumber(5000000000)).toBe("5.0b");
    });

    it("should format small numbers without suffix", () => {
      expect(formatYAxisNumber(100)).toBe("100.0");
      expect(formatYAxisNumber(999)).toBe("1.0k");
    });

    it("should handle negative numbers", () => {
      expect(formatYAxisNumber(-1000)).toBe("-1.0k");
      expect(formatYAxisNumber(-1000000)).toBe("-1.0m");
    });

    it("should handle zero", () => {
      expect(formatYAxisNumber(0)).toBe("0.0");
    });

    it("should handle string numbers", () => {
      expect(formatYAxisNumber("1000")).toBe("1.0k");
      expect(formatYAxisNumber("5000000")).toBe("5.0m");
    });

    it("should handle decimal numbers", () => {
      expect(formatYAxisNumber(1234.56)).toBe("1.2k");
      expect(formatYAxisNumber(999.9)).toBe("1.0k");
    });
  });

  describe("formatDateAxis", () => {
    describe("yearly interval", () => {
      it("should return year only (YYYY)", () => {
        expect(formatDateAxis("2024-01-15", "yearly")).toBe("2024");
        expect(formatDateAxis("2023-12-31", "yearly")).toBe("2023");
      });

      it("should ignore month and day", () => {
        expect(formatDateAxis("2024-01-01", "yearly")).toBe("2024");
        expect(formatDateAxis("2024-06-15", "yearly")).toBe("2024");
        expect(formatDateAxis("2024-12-31", "yearly")).toBe("2024");
      });
    });

    describe("quarterly interval", () => {
      it("should return YYYY-Q1 format for Q1", () => {
        expect(formatDateAxis("2024-01-15", "quarterly")).toBe("2024-Q1");
        expect(formatDateAxis("2024-02-28", "quarterly")).toBe("2024-Q1");
        expect(formatDateAxis("2024-03-31", "quarterly")).toBe("2024-Q1");
      });

      it("should return YYYY-Q2 format for Q2", () => {
        expect(formatDateAxis("2024-04-15", "quarterly")).toBe("2024-Q2");
        expect(formatDateAxis("2024-05-15", "quarterly")).toBe("2024-Q2");
        expect(formatDateAxis("2024-06-30", "quarterly")).toBe("2024-Q2");
      });

      it("should return YYYY-Q3 format for Q3", () => {
        expect(formatDateAxis("2024-07-15", "quarterly")).toBe("2024-Q3");
        expect(formatDateAxis("2024-08-15", "quarterly")).toBe("2024-Q3");
        expect(formatDateAxis("2024-09-30", "quarterly")).toBe("2024-Q3");
      });

      it("should return YYYY-Q4 format for Q4", () => {
        expect(formatDateAxis("2024-10-15", "quarterly")).toBe("2024-Q4");
        expect(formatDateAxis("2024-11-15", "quarterly")).toBe("2024-Q4");
        expect(formatDateAxis("2024-12-31", "quarterly")).toBe("2024-Q4");
      });
    });

    describe("monthly interval", () => {
      it("should return YYYY-MM format", () => {
        expect(formatDateAxis("2024-01-15", "monthly")).toBe("2024-01");
        expect(formatDateAxis("2024-12-15", "monthly")).toBe("2024-12");
      });

      it("should zero-pad single digit months", () => {
        expect(formatDateAxis("2024-03-15", "monthly")).toBe("2024-03");
        expect(formatDateAxis("2024-09-15", "monthly")).toBe("2024-09");
      });

      it("should ignore day of month", () => {
        expect(formatDateAxis("2024-05-01", "monthly")).toBe("2024-05");
        expect(formatDateAxis("2024-05-15", "monthly")).toBe("2024-05");
        expect(formatDateAxis("2024-05-31", "monthly")).toBe("2024-05");
      });
    });

    describe("weekly interval", () => {
      it("should return YYYY-WXX format", () => {
        // Jan 1, 2024 (Monday) is in ISO week 2024-W01
        const result = formatDateAxis("2024-01-01", "weekly");
        expect(result).toBe("2024-W01");
      });

      it("should pad week numbers with leading zero", () => {
        const result = formatDateAxis("2024-01-08", "weekly");
        expect(result).toMatch(/2024-W0[1-9]/);
      });

      it("should handle end of year weeks correctly", () => {
        const result = formatDateAxis("2024-12-30", "weekly");
        expect(result).toMatch(/202[45]-W\d{2}/);
      });

      it("should calculate ISO week numbers correctly", () => {
        // January 4th is always in week 1
        const week1 = formatDateAxis("2024-01-04", "weekly");
        expect(week1).toBe("2024-W01");
      });

      it("should include hyphen separator", () => {
        const result = formatDateAxis("2024-06-15", "weekly");
        expect(result).toContain("-W");
      });
    });

    describe("daily interval", () => {
      it("should return YYYY-MM-DD format", () => {
        expect(formatDateAxis("2024-01-15", "daily")).toBe("2024-01-15");
        expect(formatDateAxis("2024-12-31", "daily")).toBe("2024-12-31");
      });

      it("should zero-pad single digit months and days", () => {
        expect(formatDateAxis("2024-03-05", "daily")).toBe("2024-03-05");
        expect(formatDateAxis("2024-09-08", "daily")).toBe("2024-09-08");
      });

      it("should format different dates correctly", () => {
        expect(formatDateAxis("2024-06-01", "daily")).toBe("2024-06-01");
        expect(formatDateAxis("2024-02-29", "daily")).toBe("2024-02-29");
      });
    });

    describe("edge cases", () => {
      it("should handle leap year dates", () => {
        expect(formatDateAxis("2024-02-29", "daily")).toBe("2024-02-29");
        expect(formatDateAxis("2024-02-29", "monthly")).toBe("2024-02");
        expect(formatDateAxis("2024-02-29", "quarterly")).toBe("2024-Q1");
      });

      it("should handle start of year", () => {
        expect(formatDateAxis("2024-01-01", "yearly")).toBe("2024");
        expect(formatDateAxis("2024-01-01", "quarterly")).toBe("2024-Q1");
        expect(formatDateAxis("2024-01-01", "monthly")).toBe("2024-01");
        expect(formatDateAxis("2024-01-01", "daily")).toBe("2024-01-01");
      });

      it("should handle end of year", () => {
        expect(formatDateAxis("2024-12-31", "yearly")).toBe("2024");
        expect(formatDateAxis("2024-12-31", "quarterly")).toBe("2024-Q4");
        expect(formatDateAxis("2024-12-31", "monthly")).toBe("2024-12");
        expect(formatDateAxis("2024-12-31", "daily")).toBe("2024-12-31");
      });

      it("should handle dates with different years", () => {
        expect(formatDateAxis("2023-06-15", "yearly")).toBe("2023");
        expect(formatDateAxis("2024-06-15", "yearly")).toBe("2024");
        expect(formatDateAxis("2025-06-15", "yearly")).toBe("2025");
      });

      it("should handle ISO 8601 format with timezone", () => {
        expect(formatDateAxis("2024-06-15T00:00:00Z", "daily")).toBe(
          "2024-06-15",
        );
        expect(formatDateAxis("2024-06-15T12:30:45Z", "monthly")).toBe(
          "2024-06",
        );
      });
    });

    describe("interval type safety", () => {
      it("should accept all valid interval types", () => {
        const intervals: ChartInterval[] = [
          "yearly",
          "quarterly",
          "monthly",
          "weekly",
          "daily",
        ];

        intervals.forEach((interval) => {
          const result = formatDateAxis("2024-06-15", interval);
          expect(result).toBeDefined();
          expect(typeof result).toBe("string");
        });
      });
    });
  });
});
