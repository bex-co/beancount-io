import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/134: an all-NULL aliased column reports `unknown` instead of the
 * alias name's lookalike table type. Bare columns keep the name fallback
 * (w23/136's stored-column controls), and values still win whenever any
 * cell is non-NULL.
 */
describe("aliased all-NULL column dtypes", () => {
  function nullResult(name: string, rowCount: number): QueryResult {
    return {
      columns: [name],
      rows: Array.from({ length: rowCount }, () => [null]),
      errors: [],
    } as unknown as QueryResult;
  }

  function dtype(query: string, name: string, rowCount: number): string {
    const table = queryResultToShellResult(
      nullResult(name, rowCount),
      extractSelectAliases(query),
    ).table!;
    return table.types[0]!.dtype;
  }

  it.each([
    ["SELECT payee AS number FROM postings", "number"],
    ["SELECT payee AS date FROM postings", "date"],
    ["SELECT upper(payee) AS number FROM postings", "number"],
    ["SELECT NULL AS number LIMIT 1", "number"],
    ["SELECT 'number' AS number FROM postings", "number"],
    ["SELECT payee AS xyz FROM postings", "xyz"],
  ])("reports unknown for %p with rows and without", (query, name) => {
    expect(dtype(query, name, 2)).toBe("unknown");
    expect(dtype(query, name, 0)).toBe("unknown");
  });

  it.each([
    ["SELECT number FROM postings WHERE FALSE", "number", "Decimal"],
    ["SELECT payee FROM postings WHERE FALSE", "payee", "str"],
    ["SELECT date FROM postings WHERE FALSE", "date", "date"],
    ["SELECT tags FROM postings WHERE FALSE", "tags", "set"],
    ["SELECT count(*) FROM postings WHERE FALSE", "count(*)", "int"],
    ["SELECT number AS number FROM postings", "number", "Decimal"],
    ["SELECT payee AS payee FROM postings", "payee", "str"],
  ])("keeps the name fallback for %p", (query, name, expected) => {
    expect(dtype(query, name, 0)).toBe(expected);
  });

  it("lets values win over the alias whenever any cell is non-NULL", () => {
    const result = {
      columns: ["number"],
      rows: [[null], ["Employer"]],
      errors: [],
    } as unknown as QueryResult;
    const table = queryResultToShellResult(
      result,
      extractSelectAliases("SELECT payee AS number FROM postings"),
    ).table!;
    expect(table.types).toEqual([{ name: "number", dtype: "str" }]);
  });

  it("keeps legacy behavior when no alias map is passed", () => {
    const table = queryResultToShellResult(nullResult("number", 0)).table!;
    expect(table.types).toEqual([{ name: "number", dtype: "Decimal" }]);
  });

  it("drops the date width for aliased all-NULL columns in text", () => {
    expect(
      queryResultToText(
        nullResult("date", 1),
        extractSelectAliases("SELECT payee AS date FROM postings"),
      ),
    ).toBe("d\n-\n \n");
    expect(queryResultToText(nullResult("date", 1))).toBe(
      "   date   \n----------\n          \n",
    );
  });
});
