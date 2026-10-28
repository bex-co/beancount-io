import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/136 (core): derived columns carry their schema dtype on empty
 * results like stored columns do — `id` stays `int`, `other_accounts`
 * and `accounts` stay `set`. Aliased lookalikes still report `unknown`
 * through the w23/134 layer.
 */
describe("derived column dtypes on empty results", () => {
  function emptyResult(names: string[]): QueryResult {
    return {
      columns: names,
      rows: [],
      errors: [],
    } as unknown as QueryResult;
  }

  function dtypes(query: string, names: string[]): string[] {
    const table = queryResultToShellResult(
      emptyResult(names),
      extractSelectAliases(query),
    ).table!;
    return table.types.map((type) => type.dtype);
  }

  it("keeps int/set for bare derived columns", () => {
    expect(
      dtypes(
        "SELECT id, other_accounts, number FROM postings WHERE FALSE",
        ["id", "other_accounts", "number"],
      ),
    ).toEqual(["int", "set", "Decimal"]);
    expect(dtypes("SELECT id, accounts FROM entries WHERE FALSE", [
      "id",
      "accounts",
    ])).toEqual(["int", "set"]);
  });

  it("reports unknown for an alias shadowing a derived name", () => {
    expect(
      dtypes("SELECT payee AS id FROM postings WHERE FALSE", ["id"]),
    ).toEqual(["unknown"]);
    expect(
      dtypes("SELECT payee AS accounts FROM postings WHERE FALSE", [
        "accounts",
      ]),
    ).toEqual(["unknown"]);
  });

  it("keeps the name rule for redundant derived aliases", () => {
    expect(dtypes("SELECT id AS id FROM postings WHERE FALSE", ["id"])).toEqual(
      ["int"],
    );
  });
});
