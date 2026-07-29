import { describe, it, expect } from "vitest";
import { getIndentLevel } from "../utils";

describe("getIndentLevel", () => {
  it("should return 0 for items with no colons", () => {
    expect(getIndentLevel("income")).toBe(0);
    expect(getIndentLevel("expenses")).toBe(0);
    expect(getIndentLevel("assets")).toBe(0);
    expect(getIndentLevel("liabilities")).toBe(0);
    expect(getIndentLevel("equity")).toBe(0);
  });

  it("should return 1 for items with one colon", () => {
    expect(getIndentLevel("income:work")).toBe(1);
    expect(getIndentLevel("expenses:food")).toBe(1);
    expect(getIndentLevel("assets:cash")).toBe(1);
    expect(getIndentLevel("liabilities:loan")).toBe(1);
  });

  it("should return 2 for items with two colons", () => {
    expect(getIndentLevel("income:work:salary")).toBe(2);
    expect(getIndentLevel("expenses:food:groceries")).toBe(2);
    expect(getIndentLevel("assets:bank:checking")).toBe(2);
  });

  it("should return correct level for deeply nested items", () => {
    expect(getIndentLevel("a:b:c:d")).toBe(3);
    expect(getIndentLevel("a:b:c:d:e")).toBe(4);
    expect(getIndentLevel("a:b:c:d:e:f")).toBe(5);
  });

  it("should handle empty strings", () => {
    expect(getIndentLevel("")).toBe(0);
  });

  it("should handle single character items", () => {
    expect(getIndentLevel("a")).toBe(0);
    expect(getIndentLevel("a:b")).toBe(1);
  });

  it("should handle items with trailing colons", () => {
    // Edge case: items ending with colons
    expect(getIndentLevel("income:")).toBe(1);
    expect(getIndentLevel("income:work:")).toBe(2);
  });

  it("should handle items with leading colons", () => {
    // Edge case: items starting with colons
    expect(getIndentLevel(":income")).toBe(1);
    expect(getIndentLevel(":income:work")).toBe(2);
  });

  it("should handle consecutive colons", () => {
    // Edge case: consecutive colons
    expect(getIndentLevel("income::work")).toBe(2);
    expect(getIndentLevel("a:::b")).toBe(3);
  });

  it("should work with real-world account examples", () => {
    // Common beancount account structures
    expect(getIndentLevel("Assets:Bank:Checking")).toBe(2);
    expect(getIndentLevel("Expenses:Food:Restaurants:Pizza")).toBe(3);
    expect(getIndentLevel("Income:Salary:Base")).toBe(2);
    expect(getIndentLevel("Liabilities:CreditCard:Visa")).toBe(2);
  });

  it("should handle special characters in account names", () => {
    expect(getIndentLevel("Assets:Bank-Account:Checking")).toBe(2);
    expect(getIndentLevel("Expenses:Food_Delivery:Lunch")).toBe(2);
    expect(getIndentLevel("Income:W2-Salary")).toBe(1);
  });

  it("should be consistent for same structure", () => {
    const items = [
      "income:work:salary",
      "expenses:food:groceries",
      "assets:bank:checking",
    ];

    items.forEach((item) => {
      expect(getIndentLevel(item)).toBe(2);
    });
  });

  it("should handle very long account paths", () => {
    const longPath = "a:b:c:d:e:f:g:h:i:j:k:l:m:n:o:p";
    expect(getIndentLevel(longPath)).toBe(15);
  });

  it("should return different levels for different depths", () => {
    expect(getIndentLevel("income")).toBeLessThan(
      getIndentLevel("income:work"),
    );
    expect(getIndentLevel("income:work")).toBeLessThan(
      getIndentLevel("income:work:salary"),
    );
  });
});
