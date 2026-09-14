import { describe, expect, it } from "vitest";
import {
  isPositiveDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
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
