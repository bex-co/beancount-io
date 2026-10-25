import { describe, expect, it } from "vitest";
import { amountCurrencySymbols } from "../../utils/csv-validator";
import { findImportCurrencyConflicts } from "../import-currency-conflicts";

/**
 * Smart Import stripped `€`/`£` to parse the number and then posted every row
 * in the one chosen Currency, so `€-1.25` under USD was prepared as
 * -1.25 USD (w4/m44). The symbol table is the CLI's (w3/421).
 */
const POUND = ["GBP", "GIP", "FKP", "SHP", "EGP"];

describe("amountCurrencySymbols", () => {
  it.each([
    ["€-1.25", "€", ["EUR"]],
    ["-4,50 €", "€", ["EUR"]],
    ["(€1,234.56)", "€", ["EUR"]],
    ["£2.50", "£", POUND],
    ["₩1,000", "₩", ["KRW", "KPW"]],
    ["₹ 99", "₹", ["INR"]],
    // The CLI's table has these too (w5/924).
    ["-₾4.50", "₾", ["GEL"]],
    ["-₸4.50", "₸", ["KZT"]],
    ["-₮4.50", "₮", ["MNT"]],
    ["-₼4.50", "₼", ["AZN"]],
    ["-₲4.50", "₲", ["PYG"]],
    // Unambiguous units added by w4/1059.
    ["-₿4.50", "₿", ["BTC"]],
    ["-₭1250.00", "₭", ["LAK"]],
    ["-៛2500.00", "៛", ["KHR"]],
  ])("reads %s as %s", (cell, symbol, currencies) => {
    expect(amountCurrencySymbols(cell)).toEqual([{ symbol, currencies }]);
  });

  it.each(["-1.25", "$5.00", "¥500", "US$12", "1.000,00"])(
    "names no currency for %s",
    (cell) => {
      // `$` and `¥` are shared by several currencies, so they never refuse.
      expect(amountCurrencySymbols(cell)).toEqual([]);
    },
  );

  it("reads every symbol, in order, once each (w4/1002)", () => {
    expect(amountCurrencySymbols("-€4.50£")).toEqual([
      { symbol: "€", currencies: ["EUR"] },
      { symbol: "£", currencies: POUND },
    ]);
    expect(amountCurrencySymbols("-£4.50€")).toEqual([
      { symbol: "£", currencies: POUND },
      { symbol: "€", currencies: ["EUR"] },
    ]);
    expect(amountCurrencySymbols("-€4.50€")).toEqual([
      { symbol: "€", currencies: ["EUR"] },
    ]);
    expect(amountCurrencySymbols("-$4.50€")).toEqual([
      { symbol: "€", currencies: ["EUR"] },
    ]);
  });
});

describe("findImportCurrencyConflicts", () => {
  const row = (rowIndex: number, amountInput: string, selected = true) => ({
    rowIndex,
    amountInput,
    selected,
  });

  it("groups selected rows whose symbol rules the currency out, by symbol", () => {
    const rows = [row(0, "€-1.25"), row(1, "£2.50"), row(2, "€3"), row(3, "4")];

    expect(findImportCurrencyConflicts(rows, "USD")).toEqual([
      { symbol: "€", currencies: ["EUR"], rows: [1, 3] },
      { symbol: "£", currencies: POUND, rows: [2] },
    ]);
    expect(findImportCurrencyConflicts(rows, "EUR")).toEqual([
      { symbol: "£", currencies: POUND, rows: [2] },
    ]);
    // `£` is also the Egyptian pound, so EGP is not a conflict.
    expect(findImportCurrencyConflicts([row(0, "£2.50")], "EGP")).toEqual([]);
  });

  it("refuses a row whose two symbols disagree under either currency (w4/1002)", () => {
    for (const cell of ["-€4.50£", "-£4.50€"]) {
      expect(findImportCurrencyConflicts([row(0, cell)], "EUR")).toEqual([
        { symbol: "£", currencies: POUND, rows: [1] },
      ]);
      expect(findImportCurrencyConflicts([row(0, cell)], "GBP")).toEqual([
        { symbol: "€", currencies: ["EUR"], rows: [1] },
      ]);
    }
    // Named once per symbol, in table order, beside a plain euro row.
    expect(
      findImportCurrencyConflicts(
        [row(0, "€1"), row(1, "-€4.50£"), row(2, "£2")],
        "USD",
      ),
    ).toEqual([
      { symbol: "€", currencies: ["EUR"], rows: [1, 2] },
      { symbol: "£", currencies: POUND, rows: [2, 3] },
    ]);
  });

  it("keeps matching repeats and ambiguous dollars importable", () => {
    for (const cell of ["-€4.50€", "-$4.50€", "-4.50€"]) {
      expect(findImportCurrencyConflicts([row(0, cell)], "EUR")).toEqual([]);
    }
  });

  it("refuses ₿/₭/៛ rows under USD and clears them under their own currency (w4/1059)", () => {
    const rows = [row(0, "-₿4.50"), row(1, "-₭1250.00"), row(2, "-៛2500.00")];
    expect(findImportCurrencyConflicts(rows, "USD")).toEqual([
      { symbol: "₿", currencies: ["BTC"], rows: [1] },
      { symbol: "₭", currencies: ["LAK"], rows: [2] },
      { symbol: "៛", currencies: ["KHR"], rows: [3] },
    ]);
    expect(findImportCurrencyConflicts([row(0, "-₿4.50")], "BTC")).toEqual([]);
    expect(findImportCurrencyConflicts([row(0, "-₭1250.00")], "LAK")).toEqual(
      [],
    );
    expect(findImportCurrencyConflicts([row(0, "-៛2500.00")], "KHR")).toEqual(
      [],
    );
    expect(
      findImportCurrencyConflicts([row(0, "-₭1250.00", false)], "USD"),
    ).toEqual([]);
  });

  it("ignores deselected rows", () => {
    expect(
      findImportCurrencyConflicts([row(0, "€-1.25", false)], "USD"),
    ).toEqual([]);
  });
});
