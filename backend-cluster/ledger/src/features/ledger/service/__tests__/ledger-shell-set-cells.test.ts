import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";

/**
 * w23/119: a set-typed cell renders one way on every surface — members sorted
 * and double-space-joined, the way stock beanquery prints a set — instead of
 * space-joined in text and comma-joined in structured.
 */
describe("set-typed cells in shell results", () => {
  const SET = ["Assets:Bank:Savings", "Assets:Cash", "Equity:Opening-Balances"];
  const RENDERED =
    "Assets:Bank:Savings  Assets:Cash  Equity:Opening-Balances";

  function setResult(rows: unknown[][]): QueryResult {
    return {
      columns: ["other_accounts"],
      rows: rows as QueryResult["rows"],
      errors: [],
    } as unknown as QueryResult;
  }

  it("renders a set sorted and double-space-joined in structured rows", () => {
    const table = queryResultToShellResult(setResult([[SET]])).table!;
    expect(table.rows).toEqual([[RENDERED]]);
    expect(table.types).toEqual([{ name: "other_accounts", dtype: "set" }]);
  });

  it("renders the identical string in the text table", () => {
    expect(queryResultToText(setResult([[SET]]))).toContain(RENDERED);
  });

  it("renders an empty set as the empty string on both sides", () => {
    expect(queryResultToShellResult(setResult([[[]]])).table!.rows).toEqual([
      [""],
    ]);
    expect(queryResultToText(setResult([[[]]]))).not.toContain(",");
  });

  it("keeps fava's comma-joined form for non-string arrays", () => {
    const table = queryResultToShellResult(setResult([[[1, 2]]])).table!;
    expect(table.rows).toEqual([["1, 2"]]);
  });
});
