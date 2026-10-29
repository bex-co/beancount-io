import type { QueryResult } from "@rustledger/wasm";
import { callArgSpans } from "./bql-call-args";

/**
 * `joinstr` with more than one argument (w23/186).
 *
 * rustledger 0.24.0 accepts `joinstr(set, sep, …)` but appends every argument
 * past the first to the list as one more element and joins the lot with the
 * hardcoded `", "`: `joinstr(other_accounts, ',')` ends `…, ,`, an empty set
 * with a separator yields the bare separator, and a number separator is
 * appended unchecked. Stock beanquery has no such overload and refuses it
 * (`no function matches "joinstr(set, str)"`), so the extra arguments are
 * refused before the query runs, naming the one-argument form that works.
 * Zero arguments abstain: the engine refuses those itself. Remove once the
 * engine joins with the separator; the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
export function joinstrArityError(query: string): QueryResult | undefined {
  const bad = callArgSpans(query, "joinstr").find((args) => args.length > 1);
  if (bad === undefined) return undefined;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `joinstr takes one argument on this query engine, but ${bad.length} were given: it appends the extra arguments to the list as elements instead of joining with them, so the result is wrong. Use joinstr(set), which joins with ", ".`,
        code: null,
        phase: "query",
        hint: 'Pass only the set: joinstr(other_accounts) joins with ", ".',
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
