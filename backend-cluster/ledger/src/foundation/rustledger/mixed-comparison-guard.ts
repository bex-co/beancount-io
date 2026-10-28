import type { QueryResult } from "@rustledger/wasm";

/**
 * Mixed-type `=` / `!=` / `IN` without coercion (w23/132).
 *
 * rustledger 0.24.0 evaluates cross-type equality without any coercion:
 * `date = '2026-01-01'` and `number = '3000'` read constant-False even
 * where the typed comparison matches (and the `!=` / `NOT IN` mirrors
 * constant-True / match-all), while stock beanquery refuses every form
 * at compile time. The `IN` list shares the gap. Refused before the
 * query runs, naming the mismatched operand pair and the explicit typed
 * spelling.
 *
 * Operand classes resolve syntactically; anything unproven abstains, so
 * the guard never refuses a working query:
 *
 * - Columns carry stock 0.2.0's dtypes, read per table and consistent
 *   everywhere each name appears: date (`date`, `cost_date`), number
 *   (`number`, `cost_number`, `tolerance`, `year`, `month`, `day`,
 *   `lineno` — ints and decimals share one tower, which the engine
 *   coerces correctly), str (every other scalar column), and composite
 *   (sets, positions, amounts, inventories, metadata, entries,
 *   directives). `id` types as stock says (str) even though the engine
 *   projects numbers — that mistyping refuses earlier, in w23/153's
 *   `id-column-guard`, so this entry only survives as defense in depth
 *   where the id guard does not scan.
 * - Literals: quoted text is str, digits are number (one tower),
 *   `YYYY-MM-DD` is date (stock's exact token — anything looser, like
 *   `2024-1-1`, reads as int arithmetic, exactly as stock reads it),
 *   `true`/`false` are bool. Pure-numeral arithmetic resolves number.
 * - Calls resolve through stock's `@function` outtypes (plus `count` →
 *   int); `sum`/`min`/`max`/`first`/`last` pass their argument's class
 *   through one level. Unknown, overloaded, and object-typed functions
 *   abstain, as do arithmetic over columns, CASE, and nested calls.
 * - `=` / `!=` fire when both sides resolve to different scalar
 *   classes. Either side composite defers to w23/128's guard (except
 *   the amount/set columns 128's list misses — those fire here, since
 *   mixed is mixed); either side NULL abstains (the separate it.2342
 *   NULL-comparison family).
 *   The it.3215 int/str "benign leniency" does not survive parsing
 *   literals (`1 = '1'` reads FALSE), so no carve-out: stock refuses
 *   `equal(int, str)` and so does this guard.
 * - `IN` / `NOT IN` fire when the left side resolves date or number and
 *   every element resolves to another scalar class (NULLs skipped).
 *   str-left lists abstain — stock answers those leniently too — as do
 *   mixed-element lists with a matching member (both sides murky there)
 *   and bool-left lists (unprobed).
 * - A name shadowed by an `AS <name>` alias anywhere in the query is
 *   skipped, since the alias may retype it; redundant parens are
 *   stripped and subqueries kept, so `NOT (date = 'x')` still fires.
 *   Inequalities and BETWEEN need no guard (loud on both sides, it.5659).
 *
 * Remove once the engine coerces or refuses mixed comparisons; the live
 * check in `scripts/verify-rustledger.ts` shows when.
 */
type ScalarClass = "str" | "date" | "bool" | "number";

const DATE_COLUMNS = new Set(["date", "cost_date"]);
const NUMBER_COLUMNS = new Set([
  "number",
  "cost_number",
  "tolerance",
  "year",
  "month",
  "day",
  "lineno",
]);
export const STR_COLUMNS = new Set([
  "type",
  "id",
  "filename",
  "location",
  "flag",
  "payee",
  "narration",
  "description",
  "account",
  "currency",
  "cost_currency",
  "cost_label",
  "posting_flag",
  "comment",
  "name",
]);
const COMPOSITE_COLUMNS = new Set([
  "tags",
  "links",
  "other_accounts",
  "accounts",
  "position",
  "price",
  "weight",
  "amount",
  "discrepancy",
  "balance",
  "meta",
  "entry",
  "open",
  "close",
]);
export const STR_FUNCTIONS = new Set([
  "account_sortkey",
  "commodity",
  "currency",
  "findfirst",
  "grep",
  "grepn",
  "joinstr",
  "leaf",
  "lower",
  "maxwidth",
  "parent",
  "quarter",
  "repr",
  "root",
  "splitcomp",
  "str",
  "subst",
  "substr",
  "upper",
]);
const INT_FUNCTIONS = new Set([
  "count",
  "date_diff",
  "date_part",
  "day",
  "int",
  "length",
  "month",
  "year",
]);
const DECIMAL_FUNCTIONS = new Set([
  "decimal",
  "getprice",
  "number",
  "round",
  "safediv",
]);
const BOOL_FUNCTIONS = new Set(["bool", "empty", "has_account"]);
const DATE_FUNCTIONS = new Set([
  "close_date",
  "date",
  "date_add",
  "date_bin",
  "date_trunc",
  "open_date",
  "parse_date",
  "today",
  "yearmonth",
]);
const COMPOSITE_FUNCTIONS = new Set([
  "cost",
  "value",
  "convert_amount",
  "convert_position",
  "convert_inventory",
  "filter_currency",
  "inventory_value",
  "only",
  "position_value",
]);
const PASSTHROUGH_FUNCTIONS = new Set(["sum", "min", "max", "first", "last"]);

const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
const IN_LIST =
  /\b((?:\d{4}-\d{2}-\d{2}|\w[\w.]*(?:\s*\([^()]*\))?))\s+(not\s+)?in\s*\(([^()]*)\)/gi;

type OperandClass = ScalarClass | "composite" | "null" | "unknown";

/** The query error for a mixed-type comparison, or `undefined`. */
export function mixedComparisonError(query: string): QueryResult | undefined {
  // String literals and block comments may compare mixed text.
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  const shadowed = new Set(
    [...unquoted.matchAll(ALIAS_DEF)].map((m) => (m[1] as string).toLowerCase()),
  );
  const classify = (text: string): OperandClass =>
    classifyOperand(text, shadowed);
  for (const m of unquoted.matchAll(IN_LIST)) {
    const left = classify(m[1] as string);
    if (left !== "date" && left !== "number") continue;
    const elements = splitTopLevel(m[3] as string)
      .map(classify)
      .filter((c) => c !== "null");
    if (
      elements.length > 0 &&
      elements.every((c) => c !== "unknown" && c !== left)
    ) {
      return mixedError(
        `IN compares ${left} to ${elements[0] as string} values`,
      );
    }
  }
  // Redundant parens group an operand without changing it; calls and
  // subqueries keep theirs.
  let stripped = unquoted;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = stripped.replace(
      /(?<![A-Za-z_\w])\(([^()]*)\)/g,
      (group, inner: string) =>
        /\bselect\b/i.test(inner) ? group : ` ${inner} `,
    );
    if (next === stripped) break;
    stripped = next;
  }
  const OPERAND = String.raw`(?:''|\d{4}-\d{2}-\d{2}|[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*[-+*/%]\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+))*|true|false|null|(?<![\w.])[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?(?:\s*\([^()]*\))?)`;
  const EQUALS = String.raw`(?:!=|(?<![<>=!])=(?!=))`;
  const compared = new RegExp(
    String.raw`(${OPERAND})\s*(${EQUALS})\s*(${OPERAND})`,
    "gi",
  );
  for (const m of stripped.matchAll(compared)) {
    const left = classify(m[1] as string);
    const right = classify(m[3] as string);
    if (left === "unknown" || right === "unknown") continue;
    if (left === "null" || right === "null") continue;
    if (left === "composite" || right === "composite") {
      if (left === right) continue;
      return mixedError(`${left} compared to ${right} with ${m[2] as string}`);
    }
    if (left !== right) {
      return mixedError(`${left} compared to ${right} with ${m[2] as string}`);
    }
  }
  return undefined;
}

function mixedError(detail: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Mixed-type comparison (${detail}) is not supported by this query engine: it would silently answer FALSE (TRUE for !=) without coercing. Compare same-typed values instead — date('…') for dates, bare 3000 for decimals.`,
        code: null,
        phase: "query",
        hint: "Rewrite the comparison with same-typed operands, e.g. date = date('2026-01-01').",
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

/** Resolve an operand's class, or unknown/null when unproven. */
function classifyOperand(text: string, shadowed: Set<string>): OperandClass {
  const trimmed = text.trim();
  if (trimmed === "''") return "str";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "date";
  if (/^(?:true|false)$/i.test(trimmed)) return "bool";
  if (/^null$/i.test(trimmed)) return "null";
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*[-+*/%]\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+))*$/.test(trimmed)) {
    return "number";
  }
  const call = /^([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/.exec(trimmed);
  const head = (call ? call[1] : trimmed.split(".").pop() as string).toLowerCase();
  if (shadowed.has(head)) return "unknown";
  if (call) {
    const args = (call[2] as string).trim();
    if (PASSTHROUGH_FUNCTIONS.has(head)) {
      if (args === "" || args === "*") return "unknown";
      return classifyOperand(
        args.replace(/^(?:distinct|all)\s+/i, ""),
        shadowed,
      );
    }
    if (STR_FUNCTIONS.has(head)) return "str";
    if (INT_FUNCTIONS.has(head) || DECIMAL_FUNCTIONS.has(head)) return "number";
    if (BOOL_FUNCTIONS.has(head)) return "bool";
    if (DATE_FUNCTIONS.has(head)) return "date";
    if (COMPOSITE_FUNCTIONS.has(head)) return "composite";
    return "unknown";
  }
  if (DATE_COLUMNS.has(head)) return "date";
  if (NUMBER_COLUMNS.has(head)) return "number";
  if (STR_COLUMNS.has(head)) return "str";
  if (COMPOSITE_COLUMNS.has(head)) return "composite";
  return "unknown";
}

/** Split on commas outside any paren level. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}
