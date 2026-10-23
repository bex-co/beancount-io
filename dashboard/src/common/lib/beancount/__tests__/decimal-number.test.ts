import { describe, expect, it } from "vitest";
import {
  isPositiveDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalFractions,
  sumDecimalNumbers,
} from "../decimal-number";

describe("parseDecimalNumber", () => {
  it.each([
    ["0.00000001", "0.00000001"],
    ["12345678901234567890", "12345678901234567890"],
    ["123456789.123456789", "123456789.123456789"],
    ["100.10", "100.10"],
    ["1e-8", "0.00000001"],
    ["-2E-8", "-0.00000002"],
    ["1.5e3", "1500"],
    [" +42 ", "42"],
    [".5", "0.5"],
    ["-.5", "-0.5"],
    ["5.", "5"],
    ["007.50", "7.50"],
    ["-0", "0"],
    ["-0.00", "0.00"],
  ])("keeps %j as the plain decimal %j", (typed, expected) => {
    expect(parseDecimalNumber(typed)).toBe(expected);
  });

  it.each([
    "",
    " ",
    ".",
    "-",
    "1,000",
    "12abc",
    "Infinity",
    "NaN",
    "1e",
    "0x10",
    "1e999",
  ])("rejects %j", (typed) => {
    expect(parseDecimalNumber(typed)).toBeNull();
  });
});

describe("isPositiveDecimalNumber", () => {
  it.each(["12.50", "0.00000001", "1e-8"])("accepts %j", (typed) => {
    expect(isPositiveDecimalNumber(typed)).toBe(true);
  });

  it.each(["0", "0.00", "-1", "abc", ""])("rejects %j", (typed) => {
    expect(isPositiveDecimalNumber(typed)).toBe(false);
  });
});

describe("negateDecimalNumber", () => {
  it.each([
    ["5.5", "-5.5"],
    ["-4.5", "4.5"],
    ["0", "0"],
    ["0.00", "0.00"],
    ["12345678901234567890", "-12345678901234567890"],
  ])("negates %j to %j", (value, expected) => {
    expect(negateDecimalNumber(value)).toBe(expected);
  });
});

describe("sumDecimalNumbers", () => {
  it.each<[string[], string]>([
    [["0.1", "0.2"], "0.3"],
    [["10", "-4"], "6"],
    [["10.50", "-4"], "6.50"],
    [["0.00000001", "0.00000002"], "0.00000003"],
    [["12345678901234567890", "1"], "12345678901234567891"],
    [["-0.5", "0.25"], "-0.25"],
    [["1", "-1.00"], "0.00"],
    [["0", "0"], "0"],
    [[], "0"],
  ])("sums %j to %j", (values, expected) => {
    expect(sumDecimalNumbers(values)).toBe(expected);
  });
});

describe("sumDecimalFractions", () => {
  const term = (value: string, numerator: number, denominator: number) => ({
    value,
    numerator,
    denominator,
  });

  it("sums whole periods exactly, written to the places asked for", () => {
    // 1650 a month over February, one day at a time, is 1650 exactly.
    expect(sumDecimalFractions([term("1650.00", 28, 28)], 2)).toBe("1650.00");
    expect(sumDecimalFractions([term("9007199254740993", 1, 1)], 2)).toBe(
      "9007199254740993.00",
    );
  });

  it("adds fractions with different periods exactly before rounding once", () => {
    // 1650 × 15/31 + 1800 × 16/31 = 1727.4193…
    expect(
      sumDecimalFractions([term("1650", 15, 31), term("1800", 16, 31)], 2),
    ).toBe("1727.42");
    // 1/3 + 2/3 is 1, not 0.99 from rounding each part.
    expect(sumDecimalFractions([term("1", 1, 3), term("1", 2, 3)], 2)).toBe(
      "1.00",
    );
  });

  it("rounds half away from zero, without a negative zero", () => {
    expect(sumDecimalFractions([term("0.005", 1, 1)], 2)).toBe("0.01");
    expect(sumDecimalFractions([term("-0.005", 1, 1)], 2)).toBe("-0.01");
    expect(sumDecimalFractions([term("-0.004", 1, 1)], 2)).toBe("0.00");
    expect(sumDecimalFractions([term("1", 1, 3)], 0)).toBe("0");
  });

  it("keeps a commodity's fine digits and cancels signed terms exactly", () => {
    expect(sumDecimalFractions([term("4.00995", 31, 31)], 5)).toBe("4.00995");
    expect(
      sumDecimalFractions([term("0.1", 1, 1), term("-0.1", 1, 1)], 3),
    ).toBe("0.000");
    expect(sumDecimalFractions([], 2)).toBe("0.00");
  });
});
