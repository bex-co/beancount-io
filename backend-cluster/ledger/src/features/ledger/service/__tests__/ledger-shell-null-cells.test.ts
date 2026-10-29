import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";

/**
 * w23/075 option b1: a NULL cell stays `null` in the shell result, so REST and
 * MCP structured rows tell a missing payee or price from an empty string.
 * GraphQL `queryShell` keeps its `""` in backend-v2's resolver; the text table
 * still prints a NULL as a blank.
 */
describe("NULL cells in shell results", () => {
  const result = {
    columns: ["payee", "price", "narration"],
    rows: [
      [null, undefined, ""],
      ["Café", null, "lunch"],
    ],
    errors: [],
  } as unknown as QueryResult;

  it("keeps a missing payee or price null and an empty string empty", () => {
    expect(queryResultToShellResult(result).table!.rows).toEqual([
      [null, null, ""],
      ["Café", null, "lunch"],
    ]);
  });

  it("keeps a NULL aggregate over an empty filter null, with its natural dtype", () => {
    const empty = {
      columns: ["sum(number)", "count(*)"],
      rows: [[null, 0]],
      errors: [],
    } as unknown as QueryResult;
    const table = queryResultToShellResult(empty).table!;
    expect(table.rows).toEqual([[null, 0]]);
    expect(table.types.map((type) => type.dtype)).toEqual(["Decimal", "int"]);
  });

  it("still prints a NULL as a blank in the text table", () => {
    const text = queryResultToText(result);
    expect(text).toContain("Café");
    expect(text).not.toContain("null");
  });
});
