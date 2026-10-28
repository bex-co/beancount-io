import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/167: Amount-typed bare columns keep their schema dtype without
 * values — `price` (postings), `amount` (prices/balances), and
 * `discrepancy` (balances) report `Amount` on zero rows and on
 * all-NULL cells, like every other stored column keeps its family.
 * `tolerance` (balances) keeps `Decimal`. Aliased lookalikes still
 * report `unknown` through the w23/134 layer.
 */
describe("amount column dtypes without values", () => {
  function shellResult(names: string[], rows: unknown[][]): QueryResult {
    return {
      columns: names,
      rows,
      errors: [],
    } as unknown as QueryResult;
  }

  function dtypes(query: string, names: string[], rows: unknown[][]): string[] {
    const table = queryResultToShellResult(
      shellResult(names, rows),
      extractSelectAliases(query),
    ).table!;
    return table.types.map((type) => type.dtype);
  }

  it("keeps Amount/Decimal for bare columns on zero rows", () => {
    expect(
      dtypes("SELECT price FROM postings WHERE FALSE", ["price"], []),
    ).toEqual(["Amount"]);
    expect(
      dtypes(
        "SELECT amount FROM prices WHERE FALSE",
        ["amount"],
        [],
      ),
    ).toEqual(["Amount"]);
    expect(
      dtypes(
        "SELECT amount, tolerance, discrepancy FROM balances WHERE FALSE",
        ["amount", "tolerance", "discrepancy"],
        [],
      ),
    ).toEqual(["Amount", "Decimal", "Amount"]);
  });

  it("holds the bare column beside a valued amount call", () => {
    // The note's repro shape: NULL price beside a valued cost(position).
    expect(
      dtypes("SELECT price, cost(position) LIMIT 1", ["price", "cost(position)"], [
        [null, { number: "3000.00", currency: "USD" }],
      ]),
    ).toEqual(["Amount", "Amount"]);
  });

  it("keeps Amount for bare price on all-NULL cells", () => {
    expect(
      dtypes("SELECT price, cost_number FROM postings LIMIT 2", ["price", "cost_number"], [
        [null, null],
        [null, null],
      ]),
    ).toEqual(["Amount", "Decimal"]);
  });

  it("reports unknown for an alias shadowing an amount name", () => {
    expect(
      dtypes("SELECT payee AS price FROM postings WHERE FALSE", ["price"], []),
    ).toEqual(["unknown"]);
  });

  it("keeps the name rule for a redundant amount alias", () => {
    expect(
      dtypes("SELECT price AS price FROM postings WHERE FALSE", ["price"], []),
    ).toEqual(["Amount"]);
  });
});
