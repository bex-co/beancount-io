import { describe, expect, it } from "vitest";
import {
  isCurrencyConversion,
  resolvePresentationConversion,
  toWrittenConversion,
} from "../conversion";

describe("resolvePresentationConversion", () => {
  const operatingCurrencies = ["USD", "IRT", "EUR"];

  it("passes through the three keywords", () => {
    expect(resolvePresentationConversion("at_cost", operatingCurrencies)).toBe(
      "at_cost",
    );
    expect(resolvePresentationConversion("at_value", operatingCurrencies)).toBe(
      "at_value",
    );
    expect(resolvePresentationConversion("units", operatingCurrencies)).toBe(
      "units",
    );
  });

  it("passes through an operating currency", () => {
    expect(resolvePresentationConversion("IRT", operatingCurrencies)).toBe(
      "IRT",
    );
  });

  it("falls back to at_cost when no selection is present", () => {
    expect(resolvePresentationConversion("", operatingCurrencies)).toBe(
      "at_cost",
    );
  });

  it("falls back to at_cost for a stale or unknown currency", () => {
    expect(resolvePresentationConversion("XYZ", operatingCurrencies)).toBe(
      "at_cost",
    );
    expect(resolvePresentationConversion("BTC", operatingCurrencies)).toBe(
      "at_cost",
    );
  });
});

describe("isCurrencyConversion", () => {
  it("is false for the three keywords", () => {
    expect(isCurrencyConversion("at_cost")).toBe(false);
    expect(isCurrencyConversion("at_value")).toBe(false);
    expect(isCurrencyConversion("units")).toBe(false);
  });

  it("is true for a currency code", () => {
    expect(isCurrencyConversion("IRT")).toBe(true);
    expect(isCurrencyConversion("USD")).toBe(true);
  });
});

describe("toWrittenConversion", () => {
  it("writes an empty value for at_cost so the URL drops the param", () => {
    expect(toWrittenConversion("at_cost")).toBe("");
  });

  it("passes through everything else unchanged", () => {
    expect(toWrittenConversion("IRT")).toBe("IRT");
    expect(toWrittenConversion("at_value")).toBe("at_value");
    expect(toWrittenConversion("units")).toBe("units");
  });
});
