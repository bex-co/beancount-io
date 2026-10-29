import type { QueryResult } from "@rustledger/wasm";

/**
 * Out-of-range column ordinals in `GROUP BY` / `ORDER BY` / `PIVOT BY`
 * (w23/187).
 *
 * Stock beanquery refuses a key-list ordinal that names no SELECT column
 * (`invalid ORDER-BY column index …`). rustledger 0.24.0 does the same up to
 * i64::MAX, but past it it cannot lex the numeral as an ordinal and
 * constant-folds it instead: `ORDER BY 9223372036854775808` sorts nothing,
 * `GROUP BY 99999999999999999999999` collapses every row into one group, and
 * `PIVOT BY 0` silently reads as column 1. Each answers a query the writer
 * did not ask, so the ordinal is refused before it runs: a bare numeral past
 * i64::MAX in any of the three key lists, and `0` in a PIVOT BY (the
 * sibling clauses already refuse 0 loudly).
 *
 * Syntactic and abstaining on doubt: only a key-list item that is exactly a
 * numeral (an ORDER BY item may carry ASC/DESC) is judged, calls and
 * subqueries keep their own commas, and string literals and comments are
 * blanked first. Remove once the engine refuses these itself; the live check
 * in `scripts/verify-rustledger.ts` shows when.
 */
const I64_MAX = "9223372036854775807";
const CLAUSE = /\b(group\s+by|order\s+by|pivot\s+by)\b/gi;
const LIST_END = /^(?:having|order\s+by|pivot\s+by|limit)\b/i;

export function ordinalRangeError(query: string): QueryResult | undefined {
  const blanked = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'[^']*'|"[^"]*"/g, "''");
  for (const match of blanked.matchAll(CLAUSE)) {
    const clause = (match[1] as string).toLowerCase().replace(/\s+/g, " ");
    const items = keyList(blanked, (match.index as number) + match[0].length);
    for (const item of items) {
      const ordinal = /^(\d+)(?:\s+(?:asc|desc))?$/i.exec(item)?.[1];
      if (ordinal === undefined) continue;
      if (exceedsI64(ordinal)) {
        return refusal(
          clause.toUpperCase(),
          ordinal,
          "is past the largest column index this engine reads",
        );
      }
      if (clause === "pivot by" && /^0+$/.test(ordinal)) {
        return refusal(
          "PIVOT BY",
          ordinal,
          "is not a column: ordinals start at 1",
        );
      }
    }
  }
  return undefined;
}

/** The top-level comma-separated items of the key list starting at `from`. */
function keyList(text: string, from: number): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = from;
  let end = text.length;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;
    else if (depth === 0 && (ch === ")" || ch === ";")) {
      end = i;
      break;
    } else if (depth === 0 && ch === ",") {
      items.push(text.slice(start, i).trim());
      start = i + 1;
    } else if (
      depth === 0 &&
      /\w/.test(ch) &&
      !/\w/.test(text[i - 1] ?? " ") &&
      LIST_END.test(text.slice(i))
    ) {
      end = i;
      break;
    }
  }
  items.push(text.slice(start, end).trim());
  return items;
}

function exceedsI64(digits: string): boolean {
  const n = digits.replace(/^0+(?=\d)/, "");
  return (
    n.length > I64_MAX.length || (n.length === I64_MAX.length && n > I64_MAX)
  );
}

function refusal(clause: string, ordinal: string, why: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Invalid ${clause} column index ${ordinal}: it ${why}, and this query engine would silently ignore it instead of refusing. Use a column position within the SELECT list (starting at 1) or name the column.`,
        code: null,
        phase: "query",
        hint: `Replace ${clause} ${ordinal} with a SELECT column position from 1 or a column name.`,
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
