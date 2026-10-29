import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/195: `entry` (postings) is an object column and `open`/`close`
 * (accounts) are date columns; each keeps its family without values, like
 * every other stored column, instead of flipping to `str` on zero rows or
 * all-NULL cells. Aliased lookalikes still report `unknown` (w23/134).
 */
describe("entry/open/close dtypes without values", () => {
  function dtypes(query: string, names: string[], rows: unknown[][]): string[] {
    const result = {
      columns: names,
      rows,
      errors: [],
    } as unknown as QueryResult;
    return queryResultToShellResult(
      result,
      extractSelectAliases(query),
    ).table!.types.map((type) => type.dtype);
  }

  it("keeps object for bare entry on zero rows and all-NULL cells", () => {
    expect(
      dtypes("SELECT entry FROM postings WHERE FALSE", ["entry"], []),
    ).toEqual(["object"]);
    expect(
      dtypes("SELECT entry FROM postings", ["entry"], [[null], [null]]),
    ).toEqual(["object"]);
  });

  it("keeps date for the accounts table's open and close, not object", () => {
    expect(
      dtypes(
        "SELECT open, close FROM accounts WHERE FALSE",
        ["open", "close"],
        [],
      ),
    ).toEqual(["date", "date"]);
    expect(
      dtypes(
        "SELECT open, close FROM accounts",
        ["open", "close"],
        [["2026-01-01", null]],
      ),
    ).toEqual(["date", "date"]);
  });

  it("still reports a valued entry object and leaves meta to its own rule", () => {
    expect(
      dtypes(
        "SELECT entry FROM postings",
        ["entry"],
        [[{ type: "transaction" }]],
      ),
    ).toEqual(["object"]);
    expect(
      dtypes("SELECT meta FROM entries WHERE FALSE", ["meta"], []),
    ).toEqual(["object"]);
  });

  it("reports unknown for an alias shadowing these names", () => {
    expect(
      dtypes("SELECT payee AS entry FROM postings WHERE FALSE", ["entry"], []),
    ).toEqual(["unknown"]);
    expect(
      dtypes("SELECT payee AS open FROM postings WHERE FALSE", ["open"], []),
    ).toEqual(["unknown"]);
  });
});
