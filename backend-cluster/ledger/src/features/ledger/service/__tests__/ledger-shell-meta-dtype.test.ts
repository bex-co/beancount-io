import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/170: `meta` reports `object` on both tables at every endpoint.
 * Entries serves the dict (object sample); postings serves it
 * pre-stringified (`k: "v"`), so the name — not the sample — carries
 * the type there. Aliases shadowing the name keep sniffing (w23/134).
 * The serialization split itself (`k: "v"` vs `k=v`) is engine-side
 * and documented in README.md until the engine unifies it.
 */
describe("meta dtypes on both tables", () => {
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

  it("reports object for valued meta on both tables", () => {
    // Postings form: pre-stringified engine cells.
    expect(
      dtypes("SELECT meta FROM postings LIMIT 2", ["meta"], [
        ['qa-post-key: "post-value"'],
        [""],
      ]),
    ).toEqual(["object"]);
    // Entries form: dict samples.
    expect(dtypes("SELECT meta FROM entries LIMIT 2", ["meta"], [
      [{ "qa-txn-key": "txn-value" }],
      [{}],
    ])).toEqual(["object"]);
  });

  it("reports object for blank and empty meta", () => {
    expect(dtypes("SELECT meta FROM postings LIMIT 1", ["meta"], [[""]])).toEqual(
      ["object"],
    );
    expect(
      dtypes("SELECT meta FROM postings WHERE FALSE", ["meta"], []),
    ).toEqual(["object"]);
    expect(
      dtypes("SELECT meta FROM entries WHERE FALSE", ["meta"], []),
    ).toEqual(["object"]);
  });

  it("keeps the name rule through a redundant alias", () => {
    expect(
      dtypes("SELECT meta AS meta FROM postings LIMIT 1", ["meta"], [[""]]),
    ).toEqual(["object"]);
    expect(
      dtypes("SELECT meta AS m FROM postings LIMIT 1", ["m"], [[""]]),
    ).toEqual(["object"]);
  });

  it("sniffs aliases shadowing the meta name", () => {
    expect(
      dtypes("SELECT 'x' AS meta LIMIT 1", ["meta"], [["x"]]),
    ).toEqual(["str"]);
    expect(
      dtypes("SELECT payee AS meta FROM postings WHERE FALSE", ["meta"], []),
    ).toEqual(["unknown"]);
  });
});
