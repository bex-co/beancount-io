import type { QueryResult } from "@rustledger/wasm";
import { STR_COLUMNS, STR_FUNCTIONS } from "./mixed-comparison-guard";

/**
 * String concatenation with `+` (w23/154).
 *
 * Stock beanquery concatenates strings with `+` (`'a' + 'b'` → `ab`,
 * `payee + '!'` → `CITY BUS!`) and offers no `concat()` spelling, while
 * rustledger 0.24.0 only adds numbers and refuses with the generic
 * `arithmetic requires numeric values`. The engine has no concat-capable
 * spelling to rewrite to (`||` is a syntax error, `concat()` is
 * unknown, `joinstr` joins with a `", "` separator), so the gap is
 * engine-upstream (w23/blocked/022) — but the refusal should name the
 * limitation instead of the generic numeric hint. Refused before the
 * query runs, only where stock would have concatenated.
 *
 * Operands resolve syntactically, mirroring w23/132's classes; anything
 * unproven abstains, so the guard never steals a working query or a
 * more specific refusal:
 *
 * - A side counts as str when it is a string literal or a str column /
 *   str function from 132's sets. Dates, numbers, bools, NULL, unknown
 *   or overloaded functions, and `sum`/`min`/`max`/`first`/`last`
 *   abstain — mixed and NULL `+` keep 132's or the engine's refusal.
 * - Only binary `+` fires (`++` is left for the engine's syntax
 *   error). `-`, `*`, `/`, `%` co-refuse on both sides already.
 * - A name shadowed by an `AS <name>` alias anywhere in the query is
 *   skipped, since the alias may retype it (the 128 convention).
 * - Only SELECT statements are scanned.
 *
 * Remove once the engine concatenates (or refuses `+` on strings with
 * its own specific error); the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
const SELECT_STMT = /\bselect\b/i;
const OPERAND = String.raw`(?:''|\d{4}-\d{2}-\d{2}|[+-]?(?:\d+(?:\.\d+)?|\.\d+)|true|false|null|(?<![\w.])[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?(?:\s*\([^()]*\))?)`;
const PLUS = String.raw`(?<!\+)\+(?!\+)`;

const plusCompared = new RegExp(
  String.raw`(${OPERAND})\s*${PLUS}\s*(${OPERAND})`,
  "gi",
);

/** The query error for string concatenation with `+`, or `undefined`. */
export function stringConcatError(query: string): QueryResult | undefined {
  // String literals are rewritten to placeholders (which still count as
  // str); block comments may join unrelated operands.
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!SELECT_STMT.test(unquoted)) return undefined;
  const shadowed = new Set(
    [...unquoted.matchAll(ALIAS_DEF)].map((m) => (m[1] as string).toLowerCase()),
  );
  for (const m of unquoted.matchAll(plusCompared)) {
    if (isStr(m[1] as string, shadowed) && isStr(m[2] as string, shadowed)) {
      return {
        columns: [],
        rows: [],
        errors: [
          {
            message:
              "String concatenation with + is not supported by this query engine: it adds numbers only, while stock beanquery concatenates ('a' + 'b' → ab). BQL has no concat() spelling to rewrite to; concatenate outside the query instead.",
            code: null,
            phase: "query",
            hint: "Concatenate outside the query — BQL here has no string-concat spelling.",
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
  }
  return undefined;
}

/** Whether the operand is proven str (literal, column, or call head). */
function isStr(text: string, shadowed: Set<string>): boolean {
  const trimmed = text.trim();
  if (trimmed === "''") return true;
  const call = /^([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/.exec(trimmed);
  const head = (call ? call[1] : trimmed.split(".").pop() as string).toLowerCase();
  if (shadowed.has(head)) return false;
  if (call) return STR_FUNCTIONS.has(head);
  return STR_COLUMNS.has(head);
}
