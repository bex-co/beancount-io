import { describe, expect, it } from "vitest";
import { isCommaDecimalLanguage, parseTypedAmount } from "../typed-amount";

/**
 * A native number field read `4,50` as 450 in an English browser and booked
 * it silently (w2/120). The dashboard now reads the text itself.
 */
describe("parseTypedAmount", () => {
  const decimal = (value: string) => ({ kind: "decimal", decimal: value });

  it.each([
    // A lone separator before other than three digits is the decimal.
    ["4,50", true, "4.50"],
    ["4,50", false, "4.50"],
    ["4.50", true, "4.50"],
    ["0,500", true, "0.500"],
    // With both separators, the last one is the decimal.
    ["1.234,56", true, "1234.56"],
    ["1,234.56", false, "1234.56"],
    ["10 500,00", true, "10500.00"],
    // Repeated separators group thousands.
    ["1.234.567", false, "1234567"],
    ["1,234,567", true, "1234567"],
    // Before three digits, an English reader means what English writes.
    ["4,500", false, "4500"],
    ["4.500", false, "4.500"],
    // Persian digits and separators, a typographic minus, the ledger's form.
    ["۴٫۵۰", false, "4.50"],
    ["−5", false, "-5"],
    ["1e3", false, "1000"],
    // Controls: the ledger's own spelling is kept digit for digit.
    ["-12.50", true, "-12.50"],
    ["9007199254740993.01", false, "9007199254740993.01"],
  ])("reads %j (comma decimal: %s) as %s", (text, commaDecimal, expected) => {
    expect(parseTypedAmount(text, commaDecimal)).toEqual(decimal(expected));
  });

  it.each(["4,500", "4.500", "-1,250"])(
    "asks about %j in a comma-decimal language",
    (text) => {
      const parsed = parseTypedAmount(text, true);
      expect(parsed.kind).toBe("ambiguous");
    },
  );

  it("names both readings of an ambiguous amount", () => {
    expect(parseTypedAmount("4,500", true)).toEqual({
      kind: "ambiguous",
      grouped: "4500",
      decimal: "4.500",
    });
  });

  it.each(["abc", "12,34,567", "1.2.3,4,5", "--5", "4,5,6.7"])(
    "refuses %j",
    (text) => {
      expect(parseTypedAmount(text, false)).toEqual({ kind: "invalid" });
    },
  );

  it("treats blank as empty", () => {
    expect(parseTypedAmount("  ", true)).toEqual({ kind: "empty" });
  });

  it("knows which languages write a decimal comma", () => {
    expect(isCommaDecimalLanguage("de")).toBe(true);
    expect(isCommaDecimalLanguage("fr")).toBe(true);
    expect(isCommaDecimalLanguage("en")).toBe(false);
    expect(isCommaDecimalLanguage("zh")).toBe(false);
  });
});
