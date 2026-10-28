import type { QueryResult } from "@rustledger/wasm";

/**
 * `SELECT * AS <alias>` (w23/127).
 *
 * rustledger 0.24.0 accepts an aliased unqualified star and answers it
 * mismatched: one declared column (the alias) over full star-width rows —
 * so structured readers see 1 column against 31 cells and the text renderer
 * drops every value past the first. Stock beanquery ParseErrors the query
 * (a star takes no alias), as does the engine for the bare `* <alias>`
 * form. Refused before the query runs; not a rewrite, so the alias is
 * never silently dropped. Qualified `t.* AS <alias>` stays with the
 * engine, which already refuses it. Remove once the engine rejects the
 * unqualified form; the live check in `scripts/verify-rustledger.ts`
 * shows when.
 */
const STAR_ALIAS =
  /(?:\bselect\b(?:\s+(?:distinct|all)\b)?|\bdistinct\b|\ball\b|,)\s*\*\s*as\b/i;

/** The query error for an aliased unqualified star, or `undefined`. */
export function starAliasError(query: string): QueryResult | undefined {
  // String literals may narrate a query that says "select * as".
  const unquoted = query.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!STAR_ALIAS.test(unquoted)) return undefined;
  const supported = "SELECT * … (no alias), or name the columns explicitly";
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `SELECT * AS <alias> is not supported by this query engine: it would return every star column under the single alias. Use ${supported} instead.`,
        code: null,
        phase: "query",
        hint: `Remove the AS alias from the star, or expand the star into named columns.`,
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
