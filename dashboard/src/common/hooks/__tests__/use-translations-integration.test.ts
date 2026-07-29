/**
 * Integration test for useTranslations with actual i18n configuration
 * Tests that interpolation works correctly with single-brace {param} syntax
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslations } from "../use-translations";

describe("useTranslations Integration (with real i18n)", () => {
  describe("Interpolation with single-brace {param} syntax", () => {
    it("should interpolate {ledgerName} in page.trialBalance.incomeHierarchyDescription", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.trialBalance.incomeHierarchyDescription",
        {
          ledgerName: "My Test Ledger",
        },
      );

      // Should replace {ledgerName} with the actual value
      expect(translation).toBe(
        "Visual representation of My Test Ledger income composition",
      );
      expect(translation).not.toContain("{ledgerName}");
    });

    it("should interpolate {ledgerName} in page.trialBalance.assetsHierarchyDescription", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.trialBalance.assetsHierarchyDescription",
        {
          ledgerName: "Finance 2024",
        },
      );

      expect(translation).toBe(
        "Visual representation of Finance 2024 assets composition",
      );
      expect(translation).not.toContain("{ledgerName}");
    });

    it("should interpolate multiple parameters with {param} syntax", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.reports.hierarchyVisualizationDescription",
        {
          ledgerName: "Company Ledger",
          sectionName: "Revenue",
        },
      );

      expect(translation).toBe(
        "Visual representation of Company Ledger Revenue composition",
      );
      expect(translation).not.toContain("{ledgerName}");
      expect(translation).not.toContain("{sectionName}");
    });

    it("should handle translation without interpolation", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t("common.home");
      expect(translation).toBe("Home");
    });

    it("should preserve placeholder when parameter is missing", () => {
      const { result } = renderHook(() => useTranslations());

      // Call without providing the required parameter
      const translation = result.current.t(
        "page.trialBalance.incomeHierarchyDescription",
      );

      // Should preserve the placeholder since no parameter was provided
      expect(translation).toContain("{ledgerName}");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string parameter", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.trialBalance.incomeHierarchyDescription",
        {
          ledgerName: "",
        },
      );

      // Should replace with empty string
      expect(translation).toBe("Visual representation of  income composition");
      expect(translation).not.toContain("{ledgerName}");
    });

    it("should handle numeric parameter values", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.trialBalance.incomeHierarchyDescription",
        {
          ledgerName: 12345,
        },
      );

      // Should convert number to string
      expect(translation).toBe(
        "Visual representation of 12345 income composition",
      );
    });

    it("should handle special characters in parameter", () => {
      const { result } = renderHook(() => useTranslations());

      const translation = result.current.t(
        "page.trialBalance.incomeHierarchyDescription",
        {
          ledgerName: "Test & Co. <Ltd>",
        },
      );

      expect(translation).toContain("Test & Co. <Ltd>");
      expect(translation).not.toContain("{ledgerName}");
    });
  });
});
