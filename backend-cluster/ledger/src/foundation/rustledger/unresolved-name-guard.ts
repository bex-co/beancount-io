import type { QueryResult } from "@rustledger/wasm";

/**
 * Unknown names masked by empty input (w23/135).
 *
 * rustledger 0.24.0 resolves SELECT-list/WHERE/GROUP-BY/ORDER-BY names
 * lazily at row-evaluation time, so any query whose input is empty
 * succeeds even when it names a function or column that does not exist
 * — `SELECT nosuchfn(payee) … WHERE FALSE` returns clean `[]` with a
 * fabricated `str` dtype — while stock beanquery 0.2.0 refuses at
 * compile time. HAVING and PIVOT resolve eagerly, and LIMIT-0 still
 * errors (resolution runs pre-LIMIT), so only value-clause names over
 * filtered-out input mask.
 *
 * The fix is a probe, not a resolver: when a query comes back clean
 * with zero rows — or one row carrying an aggregate, which collapses
 * emptiness into `[0]`/`[null]` — and it has a WHERE to defeat, the
 * same query runs again with every WHERE (all depths) widened to
 * `WHERE ((…)) OR TRUE` plus `LIMIT 1`. Fed rows, the engine's own
 * resolver reports the bad name; only a name-shaped failure (`no
 * function matches`, `not found`) is adopted, so a value-typed probe
 * error can never refuse a good query, and the probe's error carries
 * no rows and no fabricated dtype. A throwing probe abstains.
 *
 * Deliberately uncovered: empty tables (nothing feeds the probe),
 * overload mismatches the engine reports as value errors (`UPPER
 * expects a string` — row-dependent, unlike resolution), and a probe
 * row-error that fires ahead of the name error. Remove once the engine
 * resolves names before evaluating rows; the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const NAME_ERROR = /no function matches|not found/i;
const AGGREGATE_CALL =
  /\b(?:count|sum|avg|min|max|first|last)\s*\(/i;
const TRAILING_TERMINATOR = /;\s*$/;
const CLAUSE_WORD = /^(?:group|order|limit|having|pivot)$/i;
const IDENT = /[A-Za-z_][\w$]*/y;

export function unresolvedNameError(
  query: string,
  result: QueryResult,
  run: (query: string) => QueryResult,
): QueryResult | undefined {
  if (result.errors.some((error) => error.severity === "error")) {
    return undefined;
  }
  if (result.rows.length > 1) return undefined;
  if (result.rows.length === 1 && !hasAggregateCall(query)) return undefined;
  const probe = buildResolutionProbe(query);
  if (probe === undefined) return undefined;
  let probed: QueryResult;
  try {
    probed = run(probe);
  } catch {
    return undefined;
  }
  const failure = probed.errors.find((error) => error.severity === "error");
  if (failure === undefined || !NAME_ERROR.test(failure.message)) {
    return undefined;
  }
  return probed;
}

/**
 * The query with every WHERE widened to match all rows, or undefined
 * when it has no WHERE (nothing to defeat: names over unfiltered input
 * already resolved, and empty tables stay masked).
 */
export function buildResolutionProbe(query: string): string | undefined {
  const stripped = query.replace(TRAILING_TERMINATOR, "");
  const tokens = tokenize(stripped);
  if (!tokens.some((token) => token.kind === "where")) return undefined;
  let out = "";
  let cursor = 0;
  const open: number[] = [];
  const flush = (to: number): void => {
    out += stripped.slice(cursor, to);
    cursor = to;
  };
  const closeTo = (depth: number): void => {
    while (open.length > 0 && (open[open.length - 1] as number) >= depth) {
      open.pop();
      out += ")) OR TRUE ";
    }
  };
  for (const token of tokens) {
    if (token.kind === "where") {
      flush(token.end);
      out += " ((";
      open.push(token.depth);
    } else {
      flush(token.start);
      if (token.kind === "end") closeTo(0);
      else closeTo(token.depth);
    }
  }
  flush(stripped.length);
  out = out.trimEnd();
  if (!hasTopLevelLimit(tokens)) out += " LIMIT 1";
  return out;
}

type ProbeToken = {
  kind: "where" | "clause" | "close" | "end";
  start: number;
  end: number;
  depth: number;
  word: string;
};

/**
 * WHERE/clause/close tokens outside strings and comments, each with
 * its paren depth, plus one end token. Words that are neither WHERE
 * nor a clause word collapse into the gaps between tokens.
 */
function tokenize(query: string): ProbeToken[] {
  const tokens: ProbeToken[] = [];
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
      tokens.push({ kind: "close", start: i, end: i + 1, depth, word: ")" });
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    IDENT.lastIndex = i;
    const ident = IDENT.exec(query);
    if (ident !== null && ident.index === i) {
      const word = ident[0].toLowerCase();
      const kind =
        word === "where" ? "where" : CLAUSE_WORD.test(word) ? "clause" : null;
      if (kind !== null) {
        tokens.push({
          kind,
          start: i,
          end: i + ident[0].length,
          depth,
          word,
        });
      }
      i += ident[0].length;
      continue;
    }
    i += 1;
  }
  tokens.push({
    kind: "end",
    start: query.length,
    end: query.length,
    depth: 0,
    word: "",
  });
  return tokens;
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

function hasTopLevelLimit(tokens: ProbeToken[]): boolean {
  return tokens.some(
    (token) =>
      token.kind === "clause" && token.depth === 0 && token.word === "limit",
  );
}

function hasAggregateCall(query: string): boolean {
  let stripped = "";
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    if (ch === "'" || ch === '"') {
      i = skipString(query, i);
      stripped += " ";
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      i = skipBlockComment(query, i);
      stripped += " ";
      continue;
    }
    stripped += ch;
    i += 1;
  }
  return AGGREGATE_CALL.test(stripped);
}
