import { describe, it, expect } from "vitest";
import { fractionDigitsOf, formatQuantity } from "../format-number";

/**
 * Chart tooltips are a detailed readout, so they must not round away real
 * units. The digit budget is read from the ledger's own decimal string; asking
 * the parsed double for its digits would print binary artifacts instead.
 */

describe("fractionDigitsOf", () => {
  it("counts the digits a decimal string carries", () => {
    expect(fractionDigitsOf("4.00995")).toBe(5);
    expect(fractionDigitsOf("2.00995")).toBe(5);
    expect(fractionDigitsOf("6903.12")).toBe(2);
    expect(fractionDigitsOf("-1.5")).toBe(1);
  });

  it("treats a whole number as having none", () => {
    expect(fractionDigitsOf("4")).toBe(0);
    expect(fractionDigitsOf("0")).toBe(0);
    expect(fractionDigitsOf(7)).toBe(0);
  });

  it("survives missing and malformed values", () => {
    expect(fractionDigitsOf(null)).toBe(0);
    expect(fractionDigitsOf(undefined)).toBe(0);
    expect(fractionDigitsOf("")).toBe(0);
    expect(fractionDigitsOf("1.25 ETH")).toBe(2);
  });
});

describe("formatQuantity", () => {
  const en = (value: number, digits: number) =>
    formatQuantity(value, digits, true, "en");

  it("keeps the reproduced ETH quantities whole", () => {
    expect(en(4.00995, 5)).toBe("4.00995");
    expect(en(2.00995, 5)).toBe("2.00995");
  });

  it("keeps small and negative quantities", () => {
    expect(en(0.004, 3)).toBe("0.004");
    expect(en(-1.5, 1)).toBe("-1.5");
    expect(en(-0.00001, 5)).toBe("-0.00001");
  });

  it("renders zero plainly", () => {
    expect(en(0, 0)).toBe("0");
    expect(en(0, 5)).toBe("0");
  });

  it("leaves ordinary cash exactly as it was", () => {
    expect(en(6903.12, 2)).toBe("6,903.12");
    expect(en(1234567.89, 2)).toBe("1,234,567.89");
    expect(en(4, 0)).toBe("4");
  });

  it("adds no trailing zeros of its own", () => {
    expect(en(4.5, 5)).toBe("4.5");
    expect(en(2, 5)).toBe("2");
  });

  it("never exposes a binary artifact the source did not have", () => {
    // 0.1 + 0.2 is 0.30000000000000004 as a double; the source said 1 digit.
    expect(en(0.1 + 0.2, 1)).toBe("0.3");
  });

  it("follows the locale's separators", () => {
    expect(formatQuantity(1234.00995, 5, true, "de")).toBe("1.234,00995");
  });

  it("drops separators when render_commas is off, keeping precision", () => {
    expect(formatQuantity(1234.00995, 5, false, "en")).toBe("1234.00995");
    expect(formatQuantity(6903.12, 2, false, "en")).toBe("6903.12");
    expect(formatQuantity(4, 0, false, "en")).toBe("4");
  });
});
