import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import {
  extractSelectAliases,
  extractSelectAliasHeads,
} from "../bql-select-aliases";

/**
 * w23/m14/t003: an alias over a computed head — an aggregate, a date part, an
 * arithmetic expression — reports that expression's static type on an empty
 * or all-NULL result instead of `unknown`. A bare-column head still reports
 * `unknown` (the alias may shadow a lookalike name, w23/134), and values win
 * whenever any cell is non-NULL.
 */
describe("aliased computed heads on empty results", () => {
  const dtypes = (query: string, names: string[], rows: unknown[][] = []) => {
    const result = {
      columns: names,
      rows,
      errors: [],
    } as unknown as QueryResult;
    return queryResultToShellResult(
      result,
      extractSelectAliases(query),
      extractSelectAliasHeads(query),
    ).table!.types.map((type) => type.dtype);
  };

  it.each([
    ["SELECT sum(number) AS total WHERE FALSE", ["total"], ["Decimal"]],
    ["SELECT count(*) AS n WHERE FALSE", ["n"], ["int"]],
    [
      "SELECT year(date) AS y, upper(payee) AS p WHERE FALSE",
      ["y", "p"],
      ["int", "str"],
    ],
    [
      "SELECT number + 1 AS next, number > 0 AS pos WHERE FALSE",
      ["next", "pos"],
      ["Decimal", "bool"],
    ],
    ["SELECT max(date) AS latest WHERE FALSE", ["latest"], ["date"]],
  ])("types %p from its head", (query, names, expected) => {
    expect(dtypes(query, names)).toEqual(expected);
  });

  it("types the same aliased aggregate when every cell is NULL", () => {
    expect(dtypes("SELECT sum(number) AS total", ["total"], [[null]])).toEqual([
      "Decimal",
    ]);
  });

  it("keeps unknown for a bare-column head and a NULL literal", () => {
    expect(dtypes("SELECT payee AS number WHERE FALSE", ["number"])).toEqual([
      "unknown",
    ]);
    expect(dtypes("SELECT NULL AS n WHERE FALSE", ["n"])).toEqual(["unknown"]);
  });

  it("lets values win over the head", () => {
    expect(
      dtypes("SELECT sum(number) AS total", ["total"], [["Employer"]]),
    ).toEqual(["str"]);
  });

  it("extracts each alias's head, lowercased by alias", () => {
    expect([
      ...extractSelectAliasHeads("SELECT sum(number) AS Total, payee AS p"),
    ]).toEqual([
      ["total", "sum(number)"],
      ["p", "payee"],
    ]);
  });
});
