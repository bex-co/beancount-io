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

const result = (
  rows: unknown[][],
  columns = ["account", "balance"],
): QueryResult => ({ columns, rows, errors: [] }) as unknown as QueryResult;

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

/**
 * w31/160: a sale that empties a lot leaves it in the engine's inventory as a
 * zero-unit position beside the lots still held. Stock removes the lot, so
 * `sum(position)` of 3 VTI held after selling a 5 VTI lot reads `3 VTI`, not
 * `0 VTI, 3 VTI`. The cells are the engine's own, from the note's ledger.
 */
describe("an emptied lot beside a held one", () => {
  const afterSale = inventory(["0", "VTI"], ["3", "VTI"]);
  const lines = (rows: unknown[][], columns: string[]) =>
    queryResultToText(result(rows, columns))
      .trimEnd()
      .split("\n")
      .slice(2)
      .map((line) => line.trimEnd());

  it("reads as the held lot alone in a sum(position) cell", () => {
    const columns = ["account", "sum(position)"];
    const rows = [["Assets:Broker", afterSale]];
    expect(lines(rows, columns)).toEqual(["Assets:Broker  3 VTI"]);
    expect(queryResultToShellResult(result(rows, columns)).table?.rows).toEqual(
      [["Assets:Broker", { VTI: "3" }]],
    );
  });

  it("reads as the held lot alone in a running balance column", () => {
    const columns = ["date", "balance"];
    const rows = [
      ["2026-01-02", inventory(["5", "VTI"])],
      ["2026-01-03", inventory(["5", "VTI"], ["3", "VTI"])],
      ["2026-01-04", afterSale],
    ];
    expect(lines(rows, columns)).toEqual([
      "2026-01-02  5 VTI",
      "2026-01-03  5 VTI, 3 VTI",
      "2026-01-04  3 VTI",
    ]);
  });

  it("keeps every lot still held and drops each emptied one", () => {
    const [row] = lines(
      [
        [
          "Assets:Broker",
          inventory(
            ["0", "GLD"],
            ["0", "GLD"],
            ["2", "GLD"],
            ["5", "GLD"],
            ["0.00", "USD"],
            ["10.00", "USD"],
          ),
        ],
      ],
      ["account", "sum(position)"],
    );
    expect(row).toBe("Assets:Broker  2 GLD, 5 GLD, 10.00 USD");
  });

  it("does not take the scale of an emptied lot into the structured sum", () => {
    // Stock's inventory holds only the 3 VTI lot, so fava's `simple_units`
    // reads 3, not the 3.00 that summing in the emptied 0.00 lot gave.
    const rows = [["Assets:Broker", inventory(["0.00", "VTI"], ["3", "VTI"])]];
    const columns = ["account", "sum(position)"];
    expect(queryResultToShellResult(result(rows, columns)).table?.rows).toEqual(
      [["Assets:Broker", { VTI: "3" }]],
    );
    expect(lines(rows, columns)).toEqual(["Assets:Broker  3 VTI"]);
  });

  it("still blanks an inventory of emptied lots only", () => {
    const rows = [["Assets:Broker", inventory(["0", "VTI"], ["0", "VTI"])]];
    const columns = ["account", "sum(position)"];
    const [row] = lines(rows, columns);
    expect(row).toBe("Assets:Broker");
    expect(
      queryResultToShellResult(result(rows, columns)).table?.rows[0]?.[1],
    ).toEqual({});
  });
});
