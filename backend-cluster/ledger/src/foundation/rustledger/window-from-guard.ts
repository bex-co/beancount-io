import type { QueryResult } from "@rustledger/wasm";

/**
 * Windows over named FROM (w23/139).
 *
 * rustledger 0.24.0 evaluates windows only in its default postings scope:
 * a top-level window over bare FROM (or the table-less `FROM OPEN ON`
 * scope form, or a quoted FROM, which never leaves the default scope)
 * numbers rows, while the identical window over a named table or a
 * derived table fails with `Window functions not supported in subquery
 * expressions` — though no subquery is there — and any window with
 * GROUP BY fails, bare with `cannot be evaluated in posting context`.
 * Stock beanquery has no windows at all, so bare-vs-named agreement is
 * the contract, verified live: bare and `FROM postings` return
 * identical rows in identical order under WHERE, ORDER BY, DISTINCT,
 * and GROUP BY (only error-message shapes differ for bad columns).
 *
 * Two layers share this module's detectors. The `bql-from-windows`
 * pipeline stage drops a top-level `FROM postings` under a top-level
 * implemented window without GROUP BY, rescuing the working bare form
 * (unimplemented names are not rewritten: bare answers them with the
 * engine's accurate `not yet implemented`). This guard refuses what the
 * stage cannot rescue, replacing the bogus subquery error with the
 * actual cause: unimplemented names say so, GROUP BY says so, an
 * unpipelined `FROM postings` advises omitting it, and anything else
 * names the unsupported FROM (omitting would number postings rows, not
 * the named table's, so no bare advice there). Bare working queries
 * and OVER-less calls never fire. Remove once the engine numbers
 * windows over named tables; the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const IMPLEMENTED_WINDOW_FUNCTIONS: ReadonlySet<string> = new Set([
  "row_number",
  "rank",
  "dense_rank",
]);

const IDENT = /[A-Za-z_][\w$]*/y;
const GAP = /\s*/y;
/** Clause words that can end a FROM without an alias between. */
const FROM_END_WORDS = new Set([
  "where",
  "group",
  "order",
  "limit",
  "having",
  "pivot",
]);

/** Words that can never be a table name after FROM. */
const NON_TABLE_WORDS = new Set([
  "select",
  "from",
  "where",
  "group",
  "order",
  "limit",
  "having",
  "pivot",
  "distinct",
  "all",
  "as",
  "and",
  "or",
  "not",
  "null",
  "true",
  "false",
  "open",
  "close",
]);

type TopLevelFromKind = "none" | "postings" | "other";

export function windowFromError(query: string): QueryResult | undefined {
  const found = topLevelWindowCall(query);
  if (found === undefined) return undefined;
  const from = topLevelFromKind(query);
  const grouped = hasTopLevelGroupBy(query);
  if (from === "none" && !grouped) return undefined;
  if (!found.implemented) {
    return windowError(
      `Window function '${found.name}' is not implemented in this query engine ` +
        `(only row_number, rank, and dense_rank evaluate windows).`,
    );
  }
  if (grouped) {
    return windowError(
      "Window functions are not supported with GROUP BY in this query engine.",
    );
  }
  if (from === "postings") {
    return windowError(
      "Window functions cannot evaluate over FROM postings in this query " +
        "engine (named tables route through its subquery path, which rejects " +
        "windows); omit FROM to number postings rows.",
    );
  }
  const table = topLevelFromTable(query);
  return windowError(
    `Window functions cannot evaluate over ${table} in this query engine ` +
      `(only the bare postings scope evaluates windows); omitting FROM ` +
      `numbers postings rows instead.`,
  );
}

function windowError(message: string): QueryResult {
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message,
        code: null,
        phase: "query",
        hint: "Use a bare FROM (or FROM OPEN ON) for postings-scoped windows.",
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

/**
 * The first depth-0 `<call> OVER`, or undefined. The call is any
 * identifier plus a balanced argument list — OVER-less calls never
 * count, since bare and named forms fail them identically.
 */
export function topLevelWindowCall(
  query: string,
): { name: string; implemented: boolean } | undefined {
  let depth = 0;
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      continue;
    }
    if (ch === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0) {
      const found = matchWindowCallAt(query, i);
      if (found !== undefined) return found;
    }
    i += 1;
  }
  return undefined;
}

function matchWindowCallAt(
  query: string,
  i: number,
): { name: string; implemented: boolean } | undefined {
  const prev = i > 0 ? (query[i - 1] as string) : "";
  if (prev !== "" && /[\w.$]/.test(prev)) return undefined;
  IDENT.lastIndex = i;
  const ident = IDENT.exec(query);
  if (ident === null || ident.index !== i) return undefined;
  let j = i + ident[0].length;
  GAP.lastIndex = j;
  j += (GAP.exec(query) as RegExpExecArray)[0].length;
  if (query[j] !== "(") return undefined;
  const close = matchCloseParen(query, j);
  if (close === -1) return undefined;
  GAP.lastIndex = close;
  const after = close + (GAP.exec(query) as RegExpExecArray)[0].length;
  IDENT.lastIndex = after;
  const over = IDENT.exec(query);
  if (over === null || over.index !== after) return undefined;
  if (over[0].toLowerCase() !== "over") return undefined;
  GAP.lastIndex = after + over[0].length;
  const paren =
    after + over[0].length + (GAP.exec(query) as RegExpExecArray)[0].length;
  if (query[paren] !== "(") return undefined;
  const name = ident[0].toLowerCase();
  return { name, implemented: IMPLEMENTED_WINDOW_FUNCTIONS.has(name) };
}

/** Index just past the close paren matching the open at `i`, or -1. */
function matchCloseParen(query: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j < query.length) {
    const ch = query[j] as string;
    if (ch === "'" || ch === '"') {
      j = skipString(query, j);
      continue;
    }
    if (ch === "/" && query[j + 1] === "*") {
      j = skipBlockComment(query, j);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return j + 1;
    }
    j += 1;
  }
  return -1;
}

export function hasTopLevelGroupBy(query: string): boolean {
  let depth = 0;
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && isWordAt(query, i, "group")) {
      GAP.lastIndex = i + 5;
      const next = i + 5 + (GAP.exec(query) as RegExpExecArray)[0].length;
      if (isWordAt(query, next, "by")) return true;
    }
    i += 1;
  }
  return false;
}

/**
 * The depth-0 FROM form: `postings` for the bare postings table in any
 * case, `other` for any other table name or a derived table, `none`
 * for bare queries, scope forms, quoted FROMs (which never leave the
 * default scope), and anything unparseable.
 */
function topLevelFromKind(query: string): TopLevelFromKind {
  const span = topLevelFromSpan(query);
  if (span === undefined) return "none";
  return span.postings ? "postings" : "other";
}

/** `FROM <table>` as written, for the refusal message. */
function topLevelFromTable(query: string): string {
  const span = topLevelFromSpan(query);
  if (span === undefined) return "a derived table";
  return span.postings ? "FROM postings" : span.text;
}

/**
 * The depth-0 `FROM …` span plus whether it names postings: `FROM`
 * (any case) with a depth-0 SELECT before it, followed by `(` (derived)
 * or one table word that is not `postings`, or exactly `postings`
 * followed by a clause word, `;`, `)`, or the end (never an alias).
 * Quoted names, scope keywords, reserved words, and dangling FROMs
 * stay with the engine.
 */
export function topLevelFromSpan(
  query: string,
): { start: number; end: number; postings: boolean; text: string } | undefined {
  const from = findTopLevelWord(query, "from");
  if (from === -1 || !hasSelectBefore(query, from)) return undefined;
  let j = from + 4;
  GAP.lastIndex = j;
  j += (GAP.exec(query) as RegExpExecArray)[0].length;
  const next = query[j] as string | undefined;
  if (next === "(") {
    return { start: from, end: j + 1, postings: false, text: "a derived table" };
  }
  if (next === "'" || next === '"') return undefined;
  IDENT.lastIndex = j;
  const ident = IDENT.exec(query);
  if (ident === null || ident.index !== j) return undefined;
  const word = ident[0];
  const end = j + word.length;
  if (word.toLowerCase() === "postings") {
    if (!isCleanFromEnd(query, end)) return undefined;
    return { start: from, end, postings: true, text: "FROM postings" };
  }
  if (NON_TABLE_WORDS.has(word.toLowerCase())) return undefined;
  if (!isCleanFromEnd(query, end)) return undefined;
  return {
    start: from,
    end,
    postings: false,
    text: `FROM ${word}`,
  };
}

/** A depth-0 SELECT strictly before `index`, so FROM never leads. */
function hasSelectBefore(query: string, index: number): boolean {
  let depth = 0;
  let i = 0;
  while (i < index) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && isWordAt(query, i, "select")) return true;
    i += 1;
  }
  return false;
}

/** Whether `postings` ends cleanly: clause word, `;`, `)`, or end. */
function isCleanFromEnd(query: string, end: number): boolean {
  GAP.lastIndex = end;
  const j = end + (GAP.exec(query) as RegExpExecArray)[0].length;
  if (j >= query.length) return true;
  const ch = query[j] as string;
  if (ch === ";" || ch === ")") return true;
  IDENT.lastIndex = j;
  const ident = IDENT.exec(query);
  if (ident === null || ident.index !== j) return false;
  return FROM_END_WORDS.has(ident[0].toLowerCase());
}

function findTopLevelWord(query: string, word: string): number {
  let depth = 0;
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && isWordAt(query, i, word)) return i;
    i += 1;
  }
  return -1;
}

function isWordAt(query: string, i: number, word: string): boolean {
  const prev = i > 0 ? (query[i - 1] as string) : "";
  if (prev !== "" && /[A-Za-z0-9_]/.test(prev)) return false;
  const slice = query.slice(i, i + word.length);
  if (slice.toLowerCase() !== word) return false;
  const next =
    i + word.length < query.length
      ? (query[i + word.length] as string)
      : "";
  return next === "" || !/[A-Za-z0-9_]/.test(next);
}

/** No-escape rule, like the rest of the family. */
function skipString(query: string, i: number): number {
  const quote = query[i] as string;
  let j = i + 1;
  while (j < query.length && query[j] !== quote) j += 1;
  return Math.min(j + 1, query.length);
}

function skipBlockComment(query: string, i: number): number {
  const end = query.indexOf("*/", i + 2);
  return end === -1 ? query.length : end + 2;
}
