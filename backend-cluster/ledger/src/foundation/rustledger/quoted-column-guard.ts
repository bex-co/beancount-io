import type { QueryResult } from "@rustledger/wasm";

/**
 * Double-quoted identifiers outside FROM (w23/157).
 *
 * Stock beanquery resolves `"name"` to the column when the query's table
 * has one (case-sensitively — `"Payee"` is a literal, like bare-unknown
 * names), falling back to a string literal only for unknown names, while
 * rustledger 0.24.0 lexes every `"…"` as a string literal. So
 * `SELECT "account"` returns the literal `account` where stock returns
 * the column, `WHERE "account" = '…'` matches nothing, and
 * `ORDER BY "date"` sorts by a constant — plausible-looking wrong data
 * on every surface, in every clause position. FROM is the sole exception
 * the pipeline already unquotes (w23/115, w23/130). Refused before the
 * query runs, naming the bare spelling.
 *
 * The rule is table-aware, which bounds the guard:
 *
 * - The effective table is the top-level FROM name (lowercased — table
 *   resolution agrees), or postings for the default scope. A quoted name
 *   fires only when it is exactly (case-sensitively) one of that
 *   table's stock columns — where the engine provably diverges. Unknown
 *   names stay on the literal path both sides share.
 * - Column sets are stock 0.2.0's, dumped from
 *   `beanquery/sources/beancount.py`, for the tables the engine knows.
 *   `options` is absent: the engine has no such table and errors loudly
 *   already, and stealing that message would mislead.
 * - A subquery, fold-column, or unknown FROM abstains (the whole guard):
 *   the effective scope is unproven, so the status quo stands rather
 *   than a possibly wrong refusal. `SELECT "x" FROM (SELECT …)` stays
 *   silent-wrong — the known residual.
 * - `AS "name"` alias definitions are skipped (both sides define the
 *   alias; the engine even syntax-errors there, loudly), as is the FROM
 *   clause span itself (quoted tables are 115/130's rewrite, and a
 *   quoted table that is also a column name must not fire).
 * - String literals use the no-escape quote rule shared with the other
 *   scanners: the next matching quote ends the literal.
 * - Only SELECT statements are scanned.
 *
 * Remove once the engine resolves quoted identifiers (or refuses them);
 * the live check in `scripts/verify-rustledger.ts` shows when.
 */
const SELECT_STMT = /\bselect\b/i;

/** Stock 0.2.0 columns per engine-known table (see doc comment). */
const TABLE_COLUMNS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries({
    entries: [
      "accounts", "date", "day", "description", "filename", "flag", "id",
      "lineno", "links", "meta", "month", "narration", "payee", "tags",
      "type", "year",
    ],
    postings: [
      "account", "accounts", "balance", "cost_currency", "cost_date",
      "cost_label", "cost_number", "currency", "date", "day", "description",
      "entry", "filename", "flag", "id", "lineno", "links", "location",
      "meta", "month", "narration", "number", "other_accounts", "payee",
      "position", "posting_flag", "price", "tags", "type", "weight", "year",
    ],
    balances: ["account", "amount", "date", "discrepancy", "meta", "tolerance"],
    prices: ["amount", "currency", "date", "meta"],
    commodities: ["date", "meta", "name"],
    accounts: ["account", "close", "open"],
    events: ["date", "description", "meta", "type"],
    notes: ["account", "comment", "date", "links", "meta", "tags"],
    documents: ["account", "date", "filename", "links", "meta", "tags"],
    transactions: [
      "accounts", "date", "flag", "links", "meta", "narration", "payee", "tags",
    ],
  }).map(([table, columns]) => [table, new Set(columns)] as const),
);

/** A double-quoted span and its position. */
type QuotedSpan = { name: string; start: number; end: number };

/** The query error for a quoted column mention, or `undefined`. */
export function quotedColumnError(query: string): QueryResult | undefined {
  if (!SELECT_STMT.test(stripLiterals(query))) return undefined;
  const { spans, fromName, fromStart, fromEnd } = scanQuery(query);
  const table = fromName === undefined ? "postings" : fromName.toLowerCase();
  const columns = TABLE_COLUMNS.get(table);
  // An unproven scope abstains rather than risk a wrong refusal.
  if (fromName !== undefined && columns === undefined) return undefined;
  const known = columns ?? TABLE_COLUMNS.get("postings");
  for (const span of spans) {
    if (fromStart !== undefined && span.start >= fromStart && span.end <= fromEnd) {
      continue;
    }
    if (/\bas\s*$/i.test(query.slice(0, span.start))) continue;
    if (known?.has(span.name) === true) {
      return {
        columns: [],
        rows: [],
        errors: [
          {
            message: `Quoted identifiers are not supported by this query engine outside FROM: "${span.name}" reads as the string literal '${span.name}' here, while stock beanquery resolves the ${span.name} column. Use the bare column name (${span.name}) instead of the quoted spelling.`,
            code: null,
            phase: "query",
            hint: `Replace "${span.name}" with the bare column name ${span.name}.`,
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

/** Single-quoted literals blanked (no-escape rule), for the SELECT gate. */
function stripLiterals(query: string): string {
  let out = "";
  let quote: string | undefined;
  for (const ch of query) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      out += " ";
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += " ";
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * One scan collecting double-quoted spans plus the top-level FROM name
 * and clause span. Parens inside literals do not count toward depth.
 */
function scanQuery(query: string): {
  spans: QuotedSpan[];
  fromName: string | undefined;
  fromStart: number | undefined;
  fromEnd: number;
} {
  const spans: QuotedSpan[] = [];
  let quote: string | undefined;
  let depth = 0;
  let fromStart: number | undefined;
  let fromName: string | undefined;
  let i = 0;
  const markFrom = (at: number): void => {
    if (fromStart !== undefined || depth !== 0 || quote !== undefined) return;
    if (!/\bfrom\b/i.test(query.slice(at, at + 4))) return;
    const before = query[at - 1];
    const after = query[at + 4];
    if (
      (before !== undefined && /[\w]/.test(before)) ||
      (after !== undefined && /[\w]/.test(after))
    ) {
      return;
    }
    fromStart = at;
  };
  while (i < query.length) {
    const ch = query[i] as string;
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      if (ch === '"') {
        const close = query.indexOf('"', i + 1);
        if (close === -1) break;
        spans.push({ name: query.slice(i + 1, close), start: i, end: close + 1 });
        i = close + 1;
        continue;
      }
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if ((ch === "f" || ch === "F") && depth === 0) markFrom(i);
    i += 1;
  }
  let fromEnd = query.length;
  if (fromStart !== undefined) {
    const rest = query.slice(fromStart);
    const endMatch = /\b(where|group|order|limit|having)\b/i.exec(rest);
    // The clause span ends at the next clause keyword past the FROM name;
    // a FROM at the very end runs to the end of input.
    if (endMatch !== null && (endMatch.index as number) > 4) {
      fromEnd = fromStart + (endMatch.index as number);
    }
    const nameMatch = /^\bfrom\b\s+("(?:[^"]*)"|[A-Za-z_]\w*)/i.exec(rest);
    if (nameMatch === null) {
      // `FROM (` or another unparseable shape: a sentinel that matches
      // no table, so the guard abstains (distinct from no-FROM).
      fromName = "(";
    } else {
      const raw = nameMatch[1] as string;
      fromName = raw.startsWith('"') ? raw.slice(1, -1) : raw;
    }
  }
  return { spans, fromName, fromStart, fromEnd };
}
