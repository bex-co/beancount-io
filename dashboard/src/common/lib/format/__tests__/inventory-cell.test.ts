import { describe, expect, it } from "vitest";
import {
  formatDecimalCell,
  formatInventoryCellText,
  formatInventoryEntries,
  formatInventoryLikeCell,
  isInventoryLikeDtype,
} from "../inventory-cell";

describe("inventory-cell", () => {
  describe("formatDecimalCell", () => {
    it("keeps precise decimal strings", () => {
      expect(formatDecimalCell("0.004")).toBe("0.004");
      expect(formatDecimalCell("123.456789")).toBe("123.456789");
    });

    it("normalizes exact-zero strings", () => {
      expect(formatDecimalCell("0.00")).toBe("0");
    });
  });

  describe("formatInventoryCellText", () => {
    it("formats a single currency map", () => {
      expect(formatInventoryCellText({ USD: "-3623.17" })).toBe("-3623.17 USD");
    });

    it("joins multi-currency maps with CRLF", () => {
      expect(formatInventoryCellText({ USD: "100", EUR: "200" })).toBe(
        "100 USD\r\n200 EUR",
      );
    });

    it("renders empty maps as an empty string", () => {
      expect(formatInventoryCellText({})).toBe("");
    });
  });

  describe("formatInventoryLikeCell", () => {
    it("formats Inventory and Amount dtypes", () => {
      expect(formatInventoryLikeCell({ USD: "3490.52" }, "Inventory")).toBe(
        "3490.52 USD",
      );
      expect(formatInventoryLikeCell({ ITOT: "9" }, "Amount")).toBe("9 ITOT");
    });

    it("leaves Position and other dtypes alone", () => {
      expect(
        formatInventoryLikeCell({ number: 100, currency: "USD" }, "Position"),
      ).toBeNull();
      expect(formatInventoryLikeCell({ USD: "1" }, "str")).toBeNull();
    });

    it("treats zero-net {} as empty for inventory-like columns", () => {
      expect(formatInventoryLikeCell({}, "Inventory")).toBe("");
    });
  });

  describe("formatInventoryEntries / isInventoryLikeDtype", () => {
    it("lists entries in object order", () => {
      expect(formatInventoryEntries({ GLD: "2", ITOT: "18" })).toEqual([
        { currency: "GLD", amount: "2" },
        { currency: "ITOT", amount: "18" },
      ]);
    });

    it("recognizes inventory-like dtypes only", () => {
      expect(isInventoryLikeDtype("Inventory")).toBe(true);
      expect(isInventoryLikeDtype("Amount")).toBe(true);
      expect(isInventoryLikeDtype("Position")).toBe(false);
      expect(isInventoryLikeDtype(undefined)).toBe(false);
    });
  });
});
