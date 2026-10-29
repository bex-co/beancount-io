import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";

const inventory = (...units: [string, string][]) => ({
  positions: units.map(([number, currency]) => ({
    units: { number, currency },
  })),
});

const result = (rows: unknown[][]): QueryResult =>
  ({
    columns: ["account", "balance"],
    rows,
    errors: [],
  }) as unknown as QueryResult;

/**
 * w23/200: an inventory that nets to nothing is blank in the text table, like
 * the `{}` the structured cell carries and stock's blank — the text used to
 * print the engine's zero-unit position as an invented `0.00 USD`.
 */
describe("inventory cells in the text table", () => {
  const lines = (rows: unknown[][]) =>
    queryResultToText(result(rows)).trimEnd().split("\n").slice(2);

  it("blanks a zero-net inventory and keeps the structured cell empty too", () => {
    const rows = [
      ["Assets:Cash", inventory(["5.00", "USD"])],
      ["Equity:Opening", inventory(["0.00", "USD"])],
    ];
    const text = lines(rows);
    expect(text[0]).toContain("5.00 USD");
    expect(text[1]).not.toMatch(/\d/);
    expect(text[1]).toContain("Equity:Opening");
    expect(queryResultToShellResult(result(rows)).table?.rows[1]?.[1]).toEqual(
      {},
    );
  });

  it("blanks an inventory whose lots in one currency cancel, and an empty one", () => {
    const text = lines([
      ["A", inventory(["5", "USD"], ["-5", "USD"])],
      ["B", inventory()],
    ]);
    expect(text[0]).not.toMatch(/\d/);
    expect(text[1]).not.toMatch(/\d/);
  });

  it("drops only the netted-out currency from a mixed inventory", () => {
    const [row] = lines([["A", inventory(["0", "EUR"], ["7.50", "USD"])]]);
    expect(row).toContain("7.50 USD");
    expect(row).not.toContain("EUR");
  });
});
