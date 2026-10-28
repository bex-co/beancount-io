/**
 * Static SELECT-expression typer for empty and all-NULL shell columns
 * (w23/164).
 *
 * The engine names a column for its expression text (`upper(payee)`,
 * `number + 1`, `1`, `'a'`), and with no values to sniff, the name rule can
 * only shrug `str` — misreporting `year(date)` as str and `sum(number)` as
 * str, while all-NULL `number + 1` flips Decimal whenever a value shows up.
 * This typer reports the static type instead: literals, function and
 * aggregate outtypes, and operators, with bare columns falling back to the
 * name rule (which is what leaf typing already is).
 *
 * The tower is stock beanquery 0.2.0's, probed per rule through its reported
 * column types: int+int stays int, any Decimal widens, `/` always widens to
 * Decimal, `%` follows the tower, comparisons/IN/BETWEEN/IS/AND/OR/NOT
 * report bool, `+` concatenates strings, date+int stays date, date−date
 * counts days as int. Every function outtype below was additionally verified
 * live against the engine (values, not just stock's registry): a function
 * the engine lacks or types differently stays unlisted and reports
 * `unknown` — never a confidently wrong concrete type. `~` is an engine-only
 * regex match reporting bool.
 *
 * The input is engine-emitted column text (normalized spacing, original
 * case), so matching is case-insensitive and whitespace-tolerant. Parsing is
 * deliberately shallow: single-level calls with quote-aware argument
 * splitting, n-ary operator chains folded left to right (the tower is
 * associative on types), recursion only into nested structure with a depth
 * cap. Anything unparseable reports `undefined` (the caller says `unknown`).
 */
import {
  BOOL_FUNCTIONS,
  DATE_FUNCTIONS,
  DECIMAL_FUNCTIONS,
  INT_FUNCTIONS,
  PASSTHROUGH_FUNCTIONS,
} from "@/foundation/rustledger/mixed-comparison-guard";

/**
 * BQL functions returning strings (w23/146): stock beanquery 0.2.0's
 * str-typed functions (`query_env.py`), each verified live against the
 * engine — except `repr`, which rustledger does not implement, and
 * `commodity`, whose engine outtype was never verified (w23/164).
 */
export const STRING_FUNCTIONS = new Set([
  "str",
  "upper",
  "lower",
  "substr",
  "subst",
  "leaf",
  "parent",
  "root",
  "weekday",
  "quarter",
  "currency",
  "maxwidth",
  "grep",
  "grepn",
  "splitcomp",
  "joinstr",
  "findfirst",
  "account_sortkey",
]);

const INT_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(?:\d+\.\d*|\.\d+)$/;
const IDENT_RE = /^[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)*$/;
const CALL_HEAD_RE = /^([A-Za-z_][\w$]*)\s*\(/;
const MAX_DEPTH = 50;

/** `round` preserves int-vs-Decimal (stock and engine agree); not a flat Decimal. */
const ROUND_HEAD = "round";

/**
 * Bool operators needing operands on both sides. Word operators match whole
 * words only, so `oranges` and `android` never read as `OR`/`AND`.
 */
const BOOL_PAIR_RES = [
  /(?<![\w$])or(?![\w$])/,
  /(?<![\w$])and(?![\w$])/,
  /!=/,
  /<>/,
  /<=/,
  />=/,
  /~/,
  /=(?!=)/,
  /<(?!=)/,
  />(?!=)/,
];

/** Bool operators needing an operand on the left (`x IN ...`, `x IS ...`). */
const BOOL_LEFT_RES = [
  /(?<![\w$])in(?![\w$])/,
  /(?<![\w$])between(?![\w$])/,
  /(?<![\w$])is(?![\w$])/,
];

/**
 * The static dtype of one SELECT item's text, or `undefined` when it cannot
 * be typed. `leafType` types bare column references (the name rule).
 */
export function typeOfSelectExpression(
  columnText: string,
  leafType: (leaf: string) => string,
): string | undefined {
  return typeOf(columnText.trim().toLowerCase(), leafType, 0);
}

function typeOf(
  text: string,
  leafType: (leaf: string) => string,
  depth: number,
): string | undefined {
  const expr = text.trim();
  if (expr === "" || depth > MAX_DEPTH) return undefined;
  const literal = typeOfLiteral(expr);
  if (literal !== undefined) return literal;
  const inner = unwrapParens(expr);
  if (inner !== undefined) return typeOf(inner, leafType, depth + 1);
  const call = parseCall(expr);
  if (call !== undefined) {
    return typeOfCall(call.head, call.argsText, leafType, depth);
  }
  if (hasBoolShape(expr)) return "bool";
  const arithmetic = typeOfArithmetic(expr, leafType, depth);
  if (arithmetic !== undefined) return arithmetic;
  const unary = stripUnary(expr);
  if (unary !== undefined) return typeOf(unary, leafType, depth + 1);
  if (IDENT_RE.test(expr)) return leafType(expr);
  return undefined;
}

/** Whole-text literals. A NULL literal reports `str`, as unfiltered NULL cells do. */
function typeOfLiteral(expr: string): string | undefined {
  if (isQuoted(expr)) return "str";
  if (INT_RE.test(expr)) return "int";
  if (DECIMAL_RE.test(expr)) return "Decimal";
  if (expr === "true" || expr === "false") return "bool";
  if (expr === "null") return "str";
  return undefined;
}

/** The text is exactly one quoted literal (BQL has no escape sequences). */
function isQuoted(expr: string): boolean {
  const quote = expr[0];
  if (quote !== "'" && quote !== '"') return false;
  return expr.indexOf(quote, 1) === expr.length - 1;
}

/** The text is wrapped in one balanced pair: the inside. */
function unwrapParens(expr: string): string | undefined {
  if (!expr.startsWith("(")) return undefined;
  return matchClose(expr, 0) === expr.length - 1
    ? expr.slice(1, -1)
    : undefined;
}

/** Index of the `)` closing the `(` at `open`, quote-aware, or -1. */
function matchClose(expr: string, open: number): number {
  let depth = 0;
  let quote: string | undefined;
  for (let i = open; i < expr.length; i += 1) {
    const ch = expr[i] as string;
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** The text is exactly one call: its head and raw argument text. */
function parseCall(expr: string): { head: string; argsText: string } | undefined {
  const head = CALL_HEAD_RE.exec(expr);
  if (head?.[1] === undefined) return undefined;
  const open = expr.indexOf("(", head[1].length);
  const close = matchClose(expr, open);
  if (close !== expr.length - 1) return undefined;
  return { head: head[1], argsText: expr.slice(open + 1, close) };
}

function typeOfCall(
  head: string,
  argsText: string,
  leafType: (leaf: string) => string,
  depth: number,
): string | undefined {
  if (STRING_FUNCTIONS.has(head)) return "str";
  if (INT_FUNCTIONS.has(head)) return "int";
  if (BOOL_FUNCTIONS.has(head)) return "bool";
  if (DATE_FUNCTIONS.has(head)) return "date";
  if (DECIMAL_FUNCTIONS.has(head) && head !== ROUND_HEAD) return "Decimal";
  if (head === ROUND_HEAD || PASSTHROUGH_FUNCTIONS.has(head)) {
    const [first] = splitTopLevel(argsText, ",");
    if (first === undefined || first.trim() === "") return undefined;
    const arg = typeOf(first, leafType, depth + 1);
    if (head === ROUND_HEAD) {
      return arg === "int" || arg === "Decimal" ? arg : undefined;
    }
    return arg;
  }
  return undefined;
}

/** A top-level bool-shaped operator with operands where it needs them. */
function hasBoolShape(expr: string): boolean {
  // Masked text is length-preserving, so its indices slice the original.
  const masked = maskNested(expr);
  if (/^not(?![\w$])/.test(masked) && masked.slice(3).trim() !== "") {
    return true;
  }
  const pair = (pattern: RegExp, needRight: boolean): boolean => {
    const match = pattern.exec(masked);
    if (match?.[0] === undefined || match.index === undefined) return false;
    if (expr.slice(0, match.index).trim() === "") return false;
    return (
      !needRight || expr.slice(match.index + match[0].length).trim() !== ""
    );
  };
  return (
    BOOL_PAIR_RES.some((pattern) => pair(pattern, true)) ||
    BOOL_LEFT_RES.some((pattern) => pair(pattern, false))
  );
}

/** A top-level `+`/`-`/`*`/`/`/`%` chain folded through the tower. */
function typeOfArithmetic(
  expr: string,
  leafType: (leaf: string) => string,
  depth: number,
): string | undefined {
  for (const ops of [
    ["+", "-"],
    ["*", "/", "%"],
  ]) {
    const split = splitArithmetic(expr, ops);
    if (split === undefined) continue;
    let acc = typeOf(split.terms[0] as string, leafType, depth + 1);
    for (let i = 1; i < split.terms.length; i += 1) {
      acc = combineArithmetic(
        split.joins[i - 1] as string,
        acc,
        typeOf(split.terms[i] as string, leafType, depth + 1),
      );
      if (acc === undefined) return undefined;
    }
    return acc;
  }
  return undefined;
}

/**
 * Top-level terms and their joining operators, or `undefined` when none of
 * `ops` occurs in binary position. A `+`/`-` at the start or after another
 * operator or `(` is unary and stays with its term.
 */
function splitArithmetic(
  expr: string,
  ops: string[],
): { terms: string[]; joins: string[] } | undefined {
  const terms: string[] = [];
  const joins: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let current = "";
  let prevSigil = "";
  for (const ch of expr) {
    if (quote !== undefined) {
      current += ch;
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      current += ch;
      quote = ch;
      prevSigil = "q";
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && ops.includes(ch)) {
      const unary =
        (ch === "+" || ch === "-") && (prevSigil === "" || "+-*/%(".includes(prevSigil));
      if (!unary) {
        terms.push(current);
        joins.push(ch);
        current = "";
        prevSigil = ch;
        continue;
      }
    }
    current += ch;
    if (ch.trim() !== "") prevSigil = ch;
  }
  if (joins.length === 0) return undefined;
  terms.push(current);
  return { terms, joins };
}

/**
 * One tower step. Stock's rules, each probed: `/` always widens, `%` follows
 * the tower, `+` concatenates strings, date+int stays date, date−date counts
 * days. Anything else is untypable (`undefined`), never guessed.
 */
function combineArithmetic(
  op: string,
  left: string | undefined,
  right: string | undefined,
): string | undefined {
  if (left === undefined || right === undefined) return undefined;
  const numeric = (dtype: string): boolean =>
    dtype === "int" || dtype === "Decimal";
  const widen = (): string =>
    left === "Decimal" || right === "Decimal" ? "Decimal" : "int";
  if (op === "/") return numeric(left) && numeric(right) ? "Decimal" : undefined;
  if (op === "*" || op === "%") {
    return numeric(left) && numeric(right) ? widen() : undefined;
  }
  if (op === "+" && left === "str" && right === "str") return "str";
  if (numeric(left) && numeric(right)) return widen();
  if (op === "+") {
    if (left === "date" && right === "int") return "date";
    if (left === "int" && right === "date") return "date";
    return undefined;
  }
  if (left === "date" && right === "int") return "date";
  if (left === "date" && right === "date") return "int";
  return undefined;
}

/** Leading unary `+`/`-`: the rest. */
function stripUnary(expr: string): string | undefined {
  if (expr.startsWith("+") || expr.startsWith("-")) return expr.slice(1);
  return undefined;
}

/** Split top-level text on a separator character, quote- and paren-aware. */
function splitTopLevel(expr: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let current = "";
  for (const ch of expr) {
    if (quote !== undefined) {
      current += ch;
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      current += ch;
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/** Blank nested parens and quoted spans (length-preserving) for scans. */
function maskNested(expr: string): string {
  let out = "";
  let depth = 0;
  let quote: string | undefined;
  for (const ch of expr) {
    if (quote !== undefined) {
      out += " ";
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      out += " ";
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    if (depth > 0) {
      out += " ";
      if (ch === ")") depth -= 1;
      continue;
    }
    if (ch === ")") {
      out += " ";
      continue;
    }
    out += ch;
  }
  return out;
}
