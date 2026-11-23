import type { QueryResult } from "@rustledger/wasm";

const PRINT_FROM = /^\s*print\s+from\b/i;
const SCOPE_ONLY =
  /^(?:open\s+on\s+\d+-\d+-\d+\s*)?(?:close(?:\s+on)?\s+\d+-\d+-\d+\s*)?(?:clear\s*)?;?$/i;

/** rustledger 0.24.0 applies the filter only to transactions (w5/1201). */
export function printFromError(query: string): QueryResult | undefined {
  const prefix = PRINT_FROM.exec(query);
  if (!prefix || SCOPE_ONLY.test(query.slice(prefix[0].length).trim())) {
    return undefined;
  }
  const hint =
    "Use SELECT … FROM entries WHERE … for filtered rows, or plain PRINT for the complete ledger in Beancount syntax.";
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message:
          "This engine cannot apply PRINT FROM predicates to non-transaction directives. " +
          hint,
        code: null,
        phase: "query",
        hint,
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
