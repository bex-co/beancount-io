import type { QueryResult } from "@rustledger/wasm";

/**
 * `FROM … CLEAR` (w1/192).
 *
 * Stock beanquery's `CLEAR` books every Income and Expenses balance into
 * `Equity:Earnings:Current`, so a balance sheet as of a date reads with zeroed
 * income accounts and the period's earnings in equity. rustledger 0.24.0
 * parses the keyword and does nothing with it: the same query returned the
 * income and expense balances and no earnings row, wrong numbers with no
 * error. Refused before the query runs, naming the sum that stands in for the
 * transfer. `CLEAR` is not a column, function or table name in any BQL table,
 * so a bare `CLEAR` after `FROM` and outside a string is the clause. Remove
 * once the engine books the transfer; the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const CLEAR = /\bfrom\b[\s\S]*\bclear\b/i;

/** The query error for a `CLEAR` scope, or `undefined`. */
export function clearScopeError(query: string): QueryResult | undefined {
  // A string literal may name an account or narration that says "clear";
  // literals have no escapes, so the next matching quote ends one.
  const unquoted = query.replace(/'[^']*'|"[^"]*"/g, "''");
  if (!CLEAR.test(unquoted)) return undefined;
  const supported =
    "SELECT sum(position) FROM <the same scope> WHERE account ~ '^(Income|Expenses):'";
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `FROM … CLEAR is not supported by this query engine: it ignores the clause, so Income and Expenses keep their balances and no Equity:Earnings:Current row appears. Drop CLEAR and read the period's earnings, which CLEAR would book to Equity:Earnings:Current, with ${supported}.`,
        code: null,
        phase: "query",
        hint: `Remove CLEAR; the earnings it would transfer are ${supported}.`,
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  };
}
