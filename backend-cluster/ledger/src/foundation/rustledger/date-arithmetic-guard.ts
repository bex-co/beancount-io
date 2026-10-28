import type { QueryResult } from "@rustledger/wasm";
import {
  DATE_COLUMNS,
  DATE_FUNCTIONS,
  INT_FUNCTIONS,
  PASSTHROUGH_FUNCTIONS,
} from "./mixed-comparison-guard";

/**
 * Date arithmetic with `+`/`-` (w23/165).
 *
 * Stock beanquery shifts dates by day counts (`date + 7`, `7 + date`,
 * `date - 7`) and counts days (`date - date`), while rustledger 0.24.0
 * adds numbers only and refuses with the generic
 * `arithmetic requires numeric values`. There is no operator spelling to
 * rewrite to, so the gap is engine-upstream (w23/blocked/022) — but the
 * refusal should name the limitation and its `date_add`/`date_diff`
 * workaround instead of the generic numeric hint. Refused before the
 * query runs, only where stock would have answered.
 *
 * Operands resolve syntactically, mirroring w23/132's classes; anything
 * unproven abstains, so the guard never steals a working query:
 *
 * - `+` fires on date/int pairs in either order; `-` fires on date−int
 *   and date−date. Every other pairing (`7 - date`, `date + date`,
 *   `date + TRUE`, `date + 1.5`, `date + number`, `date + id`, `date * 2`)
 *   refuses in stock too, so it keeps the generic refusal.
 * - Dates are 132's date columns, `YYYY-MM-DD` tokens, and date calls;
 *   ints are int literals, stock-int columns (`year`, `month`, `day`,
 *   `lineno` — `id` is str in stock, `number` Decimal), and int calls.
 *   `min`/`max`/`first`/`last` pass their argument through one level;
 *   `sum` may widen to Decimal, so it abstains, as do unknown and
 *   overloaded functions, dotted names (stock has no table aliases —
 *   `p.date` parse-errors), and anything nested deeper.
 * - A leading `-` on the date side is neg, which stock refuses
 *   (`neg(date)` has no overload), so it keeps the generic refusal;
 *   `+date` passes possign through and fires like the bare date. Signs
 *   after operand content belong to the previous pair (`7 - date + 7`)
 *   or a product (`2 * +date`), never to this operand. `++` is left for
 *   the engine's syntax error, like w23/154.
 * - A name shadowed by an `AS <name>` alias anywhere in the query is
 *   skipped, since the alias may retype it (the 128 convention).
 * - Only SELECT statements are scanned; block comments are stripped and
 *   string literals blanked first, so neither joins nor splits a pair.
 * - Redundant parens unwrap to a fixpoint (`(date)`, `((date))`,
 *   `(+date)`), but a call keeps its parens even spaced (`min (date)`),
 *   subqueries keep theirs, and a paren holding `+`/`-` stays put — its
 *   inner pair scans itself, and unwrapping it would forge cross-paren
 *   pairs (`date - (7 - date)`).
 *
 * Each rule was probed against stock beanquery 0.2.0. Two accepted
 * noise shapes, both shared with 132/154's guards: an aggregate beside
 * a bare column fires where stock reports a grouping error
 * (`min(date) + year`), and precedence inside one side is unread
 * (`date + 2 * -date` fires where neg refuses).
 *
 * Remove once the engine shifts dates itself (or refuses them with its
 * own specific error); the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
const SELECT_STMT = /\bselect\b/i;
// Clause, bool, and test keywords can never start an operand — else `SELECT`
// reads as a name (`SELECT +date`) or a call head (`SELECT (date + 1)`)
// and swallows the real pair.
const KEYWORD_LIST = [
  "select",
  "from",
  "where",
  "group",
  "order",
  "limit",
  "having",
  "pivot",
  "and",
  "or",
  "not",
  "in",
  "between",
  "is",
  "like",
  "as",
  "asc",
  "desc",
  "distinct",
  "by",
];
const KEYWORDS = `(?:${KEYWORD_LIST.join("|")})`;
const OPERAND = String.raw`(?:''|\d{4}-\d{2}-\d{2}|[+-]?(?:\d+(?:\.\d+)?|\.\d+)|true|false|null|(?<![\w.])(?!${KEYWORDS}\b)[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?(?:\s*\([^()]*\))?)`;
const PLUS = String.raw`(?<!\+)\+(?!\+)`;

const plusPair = new RegExp(
  String.raw`(${OPERAND})\s*${PLUS}\s*([+-]?)\s*(${OPERAND})`,
  "gi",
);
const minusPair = new RegExp(
  String.raw`(${OPERAND})\s*-\s*([+-]?)\s*(${OPERAND})`,
  "gi",
);

/** Stock-int columns for the day-count side (probed per column). */
const INT_COLUMNS = new Set(["year", "month", "day", "lineno"]);

/** Words that bound the scan back from a left operand. */
const BOUNDARY_WORDS = new Set(KEYWORD_LIST);

const INT_RE = /^\d+$/;
const DATE_LIT_RE = /^\d{4}-\d{2}-\d{2}$/;
const CALL_RE = /^([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/;
const TRAILING_WORD_RE = /[A-Za-z_]\w*$/;

/** One operand's class: a negated date is its own class (never fires). */
type Side = "date" | "neg-date" | "int" | undefined;

/** The query error for date arithmetic with `+`/`-`, or `undefined`. */
export function dateArithmeticError(query: string): QueryResult | undefined {
  // String literals are blanked (a `+` inside one is not syntax) and block
  // comments stripped (they may join unrelated operands) — as in w23/154.
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!SELECT_STMT.test(unquoted)) return undefined;
  const shadowed = new Set(
    [...unquoted.matchAll(ALIAS_DEF)].map((m) => (m[1] as string).toLowerCase()),
  );
  const stripped = stripRedundantParens(unquoted);
  for (const [pairs, op] of [
    [plusPair, "+"],
    [minusPair, "-"],
  ] as const) {
    for (const m of stripped.matchAll(pairs)) {
      const left = leftSide(stripped, m.index, m[1] as string, shadowed);
      const right = classify(`${m[2] as string}${m[3] as string}`, shadowed);
      if (
        (op === "+" &&
          ((left === "date" && right === "int") ||
            (left === "int" && right === "date"))) ||
        (op === "-" &&
          left === "date" &&
          (right === "int" || right === "date"))
      ) {
        return {
          columns: [],
          rows: [],
          errors: [
            {
              message:
                "Date arithmetic with + and - is not supported by this query engine: it adds numbers only, while stock beanquery shifts dates by day counts. Spell it with date_add(date, days) and date_diff(first, second) instead.",
              code: null,
              phase: "query",
              hint: "Spell the shift with date_add(date, days) and the day count with date_diff(first, second).",
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
  }
  return undefined;
}

/**
 * Unwrap redundant parens to a fixpoint, keeping calls (even spaced),
 * subqueries, and parens holding `+`/`-`. A kept operator paren's inner
 * pair still scans itself; unwrapping it would forge pairs across its
 * walls.
 */
function stripRedundantParens(text: string): string {
  let stripped = text;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = stripped.replace(
      /\(([^()]*)\)/g,
      (group, inner: string, offset: number, whole: string) => {
        if (/\bselect\b/i.test(inner)) return group;
        if (/[+-]/.test(inner.trim().replace(/^[+-]/, ""))) return group;
        let j = offset - 1;
        while (j >= 0 && /\s/.test(whole[j] as string)) j -= 1;
        if (j >= 0 && /[A-Za-z_]/.test(whole[j] as string)) {
          const word = TRAILING_WORD_RE.exec(whole.slice(0, j + 1))?.[0] ?? "";
          if (!BOUNDARY_WORDS.has(word.toLowerCase())) return group;
        }
        return ` ${inner} `;
      },
    );
    if (next === stripped) break;
    stripped = next;
  }
  return stripped;
}

/**
 * The left operand's class: a sign before the match is the operand's own
 * leading sign only past a boundary (else the previous pair's operator
 * or a product's — `7 - date + 7`, `2 * +date` — and the pair abstains).
 */
function leftSide(
  text: string,
  matchIndex: number,
  matched: string,
  shadowed: Set<string>,
): Side {
  let j = matchIndex - 1;
  while (j >= 0 && /\s/.test(text[j] as string)) j -= 1;
  let sign = "";
  if (text[j] === "+" || text[j] === "-") {
    sign = text[j] as string;
    j -= 1;
    while (j >= 0 && /\s/.test(text[j] as string)) j -= 1;
  }
  if (j < 0 || ",;()=!<>&|~".includes(text[j] as string)) {
    return classify(`${sign}${matched}`, shadowed);
  }
  if (/[A-Za-z_]/.test(text[j] as string)) {
    const word = TRAILING_WORD_RE.exec(text.slice(0, j + 1))?.[0] ?? "";
    if (BOUNDARY_WORDS.has(word.toLowerCase())) {
      return classify(`${sign}${matched}`, shadowed);
    }
  }
  return undefined;
}

/** One operand's class: literals, columns, and one-level calls. */
function classify(text: string, shadowed: Set<string>): Side {
  let rest = text.trim();
  // possign passes dates through; neg has no date overload.
  if (rest.startsWith("+")) rest = rest.slice(1).trim();
  const negated = rest.startsWith("-");
  if (negated) rest = rest.slice(1).trim();
  const date = (): Side => (negated ? "neg-date" : "date");
  if (rest === "''") return undefined;
  if (DATE_LIT_RE.test(rest)) return date();
  if (INT_RE.test(rest)) return "int";
  if (/^(true|false|null)$/i.test(rest)) return undefined;
  const call = CALL_RE.exec(rest);
  const head = (
    call ? (call[1] as string) : (rest.split(".").pop() as string)
  ).toLowerCase();
  if (shadowed.has(head)) return undefined;
  if (call) {
    if (DATE_FUNCTIONS.has(head)) return date();
    if (INT_FUNCTIONS.has(head)) return "int";
    // `sum` may widen ints to Decimal (unprobed) — only the exact
    // passthroughs resolve, through one argument level.
    if (head !== "sum" && PASSTHROUGH_FUNCTIONS.has(head)) {
      const [first] = (call[2] as string).split(",");
      if (first === undefined || /[()]/.test(first)) return undefined;
      const inner = classify(first, shadowed);
      if (inner === undefined || inner === "neg-date") return inner;
      return negated && inner === "date" ? "neg-date" : inner;
    }
    return undefined;
  }
  // Dotted names are table-alias refs, which stock parse-errors.
  if (rest.includes(".")) return undefined;
  if (DATE_COLUMNS.has(head)) return date();
  if (INT_COLUMNS.has(head)) return "int";
  return undefined;
}
