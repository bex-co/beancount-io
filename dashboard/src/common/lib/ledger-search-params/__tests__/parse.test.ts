import { describe, expect, it } from "vitest";
import {
  applyLedgerFilterSearch,
  clearLedgerFilterSearch,
  normalizeLedgerSearchValue,
  parseLedgerFilterSearch,
} from "../parse";
import { ledgerFilterSearchSchema } from "../schema";

describe("normalizeLedgerSearchValue", () => {
  it("keeps numeric-looking years as strings", () => {
    expect(normalizeLedgerSearchValue(2016)).toBe("2016");
    expect(normalizeLedgerSearchValue("2016")).toBe("2016");
  });

  it("accepts a standard percent-containing filter without throwing", () => {
    expect(normalizeLedgerSearchValue('payee:"100%"')).toBe('payee:"100%"');
  });

  it("undoes one extra encode pass from legacy double-encoded links", () => {
    expect(normalizeLedgerSearchValue("payee%3A%22100%25%22")).toBe(
      'payee:"100%"',
    );
  });

  it("recovers from malformed percent encodings", () => {
    expect(normalizeLedgerSearchValue("payee:%ZZ")).toBe("payee:%ZZ");
    expect(normalizeLedgerSearchValue("100%")).toBe("100%");
  });

  it("returns empty for unsupported values", () => {
    expect(normalizeLedgerSearchValue(undefined)).toBe("");
    expect(normalizeLedgerSearchValue(null)).toBe("");
    expect(normalizeLedgerSearchValue({ nested: true })).toBe("");
  });
});

describe("parseLedgerFilterSearch / schema", () => {
  it("parses router JSON search including numeric years", () => {
    expect(parseLedgerFilterSearch({ time: 2016, account: "Assets" })).toEqual({
      account: "Assets",
      filter: "",
      time: "2016",
    });
  });

  it("omits empty keys from the validated schema object", () => {
    expect(ledgerFilterSearchSchema.parse({ time: 2016 })).toEqual({
      time: 2016,
    });
    expect(ledgerFilterSearchSchema.parse({})).toEqual({});
  });

  it("keeps bare years as numbers for clean URL serialization", () => {
    expect(ledgerFilterSearchSchema.parse({ time: "2016" })).toEqual({
      time: 2016,
    });
    expect(ledgerFilterSearchSchema.parse({ time: "2025-10" })).toEqual({
      time: "2025-10",
    });
  });

  it("preserves unrelated keys when applying or clearing filters", () => {
    const prev = {
      action: "new-entry",
      directive: "transaction",
      time: "2016",
      q: "select *",
    };

    expect(
      applyLedgerFilterSearch(prev, {
        account: "Assets:Cash",
        filter: "",
        time: "2017-09",
      }),
    ).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: "Assets:Cash",
      filter: undefined,
      time: "2017-09",
      q: "select *",
    });

    expect(
      applyLedgerFilterSearch(prev, {
        account: "",
        filter: "",
        time: "2016",
      }),
    ).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: undefined,
      filter: undefined,
      time: 2016,
      q: "select *",
    });

    expect(clearLedgerFilterSearch(prev)).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: undefined,
      filter: undefined,
      time: undefined,
      q: "select *",
    });
  });
});
