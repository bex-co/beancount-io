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
      conversion: "",
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
        conversion: "",
      }),
    ).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: "Assets:Cash",
      filter: undefined,
      time: "2017-09",
      conversion: undefined,
      q: "select *",
    });

    expect(
      applyLedgerFilterSearch(prev, {
        account: "",
        filter: "",
        time: "2016",
        conversion: "",
      }),
    ).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: undefined,
      filter: undefined,
      time: 2016,
      conversion: undefined,
      q: "select *",
    });

    expect(clearLedgerFilterSearch(prev)).toEqual({
      action: "new-entry",
      directive: "transaction",
      account: undefined,
      filter: undefined,
      time: undefined,
      conversion: undefined,
      q: "select *",
    });
  });
});

describe("conversion search param", () => {
  it.each(["at_cost", "units", "IRT"])(
    "round-trips %s through the schema and apply/clear helpers",
    (value) => {
      expect(ledgerFilterSearchSchema.parse({ conversion: value })).toEqual({
        conversion: value,
      });
      expect(parseLedgerFilterSearch({ conversion: value })).toEqual({
        account: "",
        filter: "",
        time: "",
        conversion: value,
      });
      expect(
        applyLedgerFilterSearch(
          {},
          { account: "", filter: "", time: "", conversion: value },
        ),
      ).toEqual({
        account: undefined,
        filter: undefined,
        time: undefined,
        conversion: value,
      });
    },
  );

  it("drops the key from the validated schema object when empty", () => {
    expect(ledgerFilterSearchSchema.parse({ conversion: "" })).toEqual({});
    expect(ledgerFilterSearchSchema.parse({})).toEqual({});
  });

  it("passes an unknown conversion value through unchanged", () => {
    expect(ledgerFilterSearchSchema.parse({ conversion: "XYZ" })).toEqual({
      conversion: "XYZ",
    });
    expect(parseLedgerFilterSearch({ conversion: "XYZ" })).toEqual({
      account: "",
      filter: "",
      time: "",
      conversion: "XYZ",
    });
  });

  it("clears conversion along with the other shared filters", () => {
    expect(clearLedgerFilterSearch({ conversion: "IRT" })).toEqual({
      account: undefined,
      filter: undefined,
      time: undefined,
      conversion: undefined,
    });
  });
});
