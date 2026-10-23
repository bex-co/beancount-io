import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";

/**
 * w23/075: a NULL cell is returned as `""`, as the pre-migration adapter
 * returned Fava's, and README.md#bql-column-types and backend-v2's
 * docs/mcp.md say so. This pins the documented contract until the owner
 * decides whether REST and MCP emit `null` instead.
 */
describe("NULL cells in shell results", () => {
  it("reads a missing payee or price as the empty string an empty value reads", () => {
    const result = {
      columns: ["payee", "price", "narration"],
      rows: [
        [null, undefined, ""],
        ["Café", null, "lunch"],
      ],
      errors: [],
    } as unknown as QueryResult;
    expect(queryResultToShellResult(result).table!.rows).toEqual([
      ["", "", ""],
      ["Café", "", "lunch"],
    ]);
  });
});
