import { matchFromKeyword, matchSelectKeyword } from "./bql-scan";

/**
 * Postings columns whose `FROM <name>` folds on every stock form (w23/116).
 *
 * Stock beanquery 0.2.0 resolves an unquoted FROM name column-first, then
 * falls back to a table, identically in every clause form (w23/124 verified
 * this against its source and by execution). Our engine instead resolves by
 * form: a bare `;`-terminated or `)`-terminated name folds, while bare-EOF and
 * with-clause names resolve tables only. So `FROM payee;` folds here (as on
 * stock) but `FROM payee LIMIT 1` table-errors (stock folds).
 *
 * This set is the empirically fold-shaped names: each folds on stock's
 * with-clause form (rows, or stock's silent empty-fold) AND folds on our
 * `;`/`(`, so routing every form through the fold matches stock — except the
 * seven empty-shape members (`cost_currency`, `cost_date`, `cost_label`,
 * `cost_number`, `links`, `posting_flag`, `price`), where our engine counts
 * the empty fold as `[[0]]` while stock returns no rows (known [0]-vs-[]
 * shape, w23/blocked/022 class). Deliberately excluded, with what they do
 * instead:
 *
 * - `accounts` — the one dual (a table and a postings column). Deliberately
 *   table-first in every unquoted form, a decision of the owner (w23/124,
 *   2026-10-30): the CLI's shipped contract (w3/247, w3/398, w5/560) already
 *   resolves it to the table, and `bea`, MCP, REST and GraphQL stay
 *   consistent. This is a known divergence from stock 0.2.0, which folds the
 *   unquoted name to postings (34 rows where we return the 12 accounts);
 *   quoted `FROM "accounts"` is the table on both.
 * - `balance` — stock crashes (`NotImplementedError`); our `;`-fold drops
 *   every row the filter keeps. Excluded, so every form errors loudly.
 * - `cost`, `units` — not stock columns at all (stock errors with a
 *   did-you-mean); excluded, so every form errors loudly.
 * - `filename`, `lineno`, `meta` — stock folds them, but our engine yields
 *   0 natively even on the bare-`;` path (source locations and meta are not
 *   tracked through the engine, w23/blocked/022 class), so they sat in this
 *   set returning silent `[[0]]`. Excluded (w23/125), so every form errors
 *   loudly instead of miscounting.
 * - `id`, `location` — same native-zero gap (stock folds, engine yields 0);
 *   never in the set, loud on every path already.
 * - `transaction`, keywords (`open`/`close`/`clear`), tables, and anything
 *   else — never folded here; untouched, loud on every path already.
 *
 * Case-sensitive: columns are (w23/blocked/022), so `PAYEE` is not `payee`.
 * Pinned against the live engine by `verify:rustledger`, which fails loudly
 * if a set member stops folding or a table starts, and asserts every
 * member's native count against the stock oracle (w23/125).
 */
export const FOLD_COLUMNS: ReadonlySet<string> = new Set([
  "account",
  "cost_currency",
  "cost_date",
  "cost_label",
  "cost_number",
  "currency",
  "date",
  "day",
  "description",
  "entry",
  "flag",
  "links",
  "month",
  "narration",
  "number",
  "other_accounts",
  "payee",
  "position",
  "posting_flag",
  "price",
  "tags",
  "type",
  "weight",
  "year",
]);

/**
 * Every projectable postings column, for the wrap's inner select list.
 *
 * The inner query must expose what the outer query may project — including
 * the columns `SELECT *` hides (`balance`, `cost`, …) — or a hidden-column
 * projection would fail wrapped while working bare. `transaction` is not
 * projectable (the engine rejects it in both spots) and stays out; `id`
 * stays out too (w23/153) — any outer `id` projection refuses at the id
 * guard before the engine runs, so the inner list never needs to expose
 * it, and listing it would trip that guard on every wrapped query.
 * Order: the engine's `SELECT *` order first, then the hidden columns
 * alphabetically; the order is unobservable (a star outer keeps a star
 * inner, and anything else names its columns).
 */
const INNER_COLUMNS = [
  "date",
  "flag",
  "payee",
  "narration",
  "account",
  "position",
  "accounts",
  "balance",
  "cost",
  "cost_currency",
  "cost_date",
  "cost_label",
  "cost_number",
  "currency",
  "day",
  "description",
  "entry",
  "filename",
  "lineno",
  "links",
  "location",
  "meta",
  "month",
  "number",
  "other_accounts",
  "posting_flag",
  "price",
  "tags",
  "type",
  "units",
  "weight",
  "year",
].join(", ");

/**
 * Routes every `FROM <column>` through the fold, whatever follows it.
 *
 * For a {@link FOLD_COLUMNS} name the engine folds only the bare-`;` and
 * `)`-terminated forms; bare-EOF and with-clause forms table-error. This
 * rewrites the broken forms onto the working ones:
 *
 * - bare-EOF (`FROM payee` + end) → inserts `;` after the name, the native
 *   fold, byte-identical to what the user would have typed;
 * - with-clause (`FROM payee LIMIT 1`, `… WHERE …`, …) → wraps the FROM in
 *   `FROM (SELECT <inner> FROM payee)`, whose `)`-terminated inner folds
 *   natively and whose outer applies the clauses over the folded rows.
 *
 * The inner list is `*` when the owning query selects exactly `*` (so a star
 * outer keeps the native star shape) and the explicit {@link INNER_COLUMNS}
 * otherwise (so hidden-column projections resolve). The owner is the nearest
 * preceding SELECT — always the right one, because BQL has one FROM per
 * level and subqueries nest only in FROM position. Bare-`;`, `)`-terminated,
 * quoted, and non-fold names pass through untouched, as does anything inside
 * a string literal (same no-escape quote rule as the other normalizers).
 *
 * Runs LAST in the shell-service pipeline (after the terminator), because a
 * trailing `;` must already be gone for bare-EOF detection to mean anything;
 * the `;` this inserts and the subquery parens are therefore never re-read.
 * Unlike the blanking normalizers this one shifts offsets past the FROM —
 * unavoidable for a rewrite, and the wrapped query is what the engine runs.
 * An unterminated literal returns the query unchanged for the engine to
 * report.
 */
export function foldBqlColumnFrom(query: string): string {
  const chars = query.split("");
  let out = "";
  let quote: string | null = null;
  // End index of the nearest preceding SELECT outside a literal, if any.
  let ownerSelectEnd = -1;
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    const selectEnd = matchSelectKeyword(chars, i);
    if (selectEnd !== -1) {
      ownerSelectEnd = selectEnd;
      out += query.slice(i, selectEnd);
      i = selectEnd;
      continue;
    }
    const fromEnd = matchFromKeyword(chars, i);
    if (fromEnd === -1) {
      out += ch;
      i += 1;
      continue;
    }
    const rewrite = matchFoldFrom(chars, fromEnd);
    if (rewrite === undefined) {
      out += query.slice(i, fromEnd);
      i = fromEnd;
      continue;
    }
    if (rewrite.kind === "insert") {
      out += query.slice(i, rewrite.nameEnd) + ";";
      i = rewrite.nameEnd;
      continue;
    }
    const inner = ownerIsStar(query, ownerSelectEnd, i) ? "*" : INNER_COLUMNS;
    // Exactly one space past the keyword: the gap is not preserved, and
    // offsets past a wrap shift regardless (documented above).
    out += `${query.slice(i, fromEnd)} (SELECT ${inner} FROM ${rewrite.name})`;
    i = rewrite.nameEnd;
  }
  return quote === null ? out : query;
}

type FoldRewrite =
  | { kind: "insert"; name: string; nameEnd: number }
  | { kind: "wrap"; name: string; nameEnd: number };

/**
 * If a fold-column name follows the `FROM` ending at `fromEnd`, how to route
 * it: insert `;` when bare to end, wrap when a clause (or anything else)
 * follows, undefined when the name already folds (`;`- or `)`-terminated),
 * is quoted, is not a fold column, or is absent (subquery, garbage).
 */
function matchFoldFrom(
  chars: string[],
  fromEnd: number,
): FoldRewrite | undefined {
  let j = fromEnd;
  while (j < chars.length && /\s/.test(chars[j] as string)) j += 1;
  const nameStart = j;
  while (j < chars.length && /[A-Za-z0-9_]/.test(chars[j] as string)) j += 1;
  if (j === nameStart) return undefined;
  if (/[0-9]/.test(chars[nameStart] as string)) return undefined;
  const name = chars.slice(nameStart, j).join("");
  if (!FOLD_COLUMNS.has(name)) return undefined;
  const nameEnd = j;
  while (j < chars.length && /\s/.test(chars[j] as string)) j += 1;
  if (j >= chars.length) return { kind: "insert", name, nameEnd };
  const next = chars[j] as string;
  if (next === ")") return undefined;
  if (next === ";") {
    let k = j + 1;
    while (k < chars.length && /\s/.test(chars[k] as string)) k += 1;
    // A trailing `;` already folds; a mid-query one means more query follows.
    if (k >= chars.length) return undefined;
  }
  return { kind: "wrap", name, nameEnd };
}

/**
 * Whether the FROM at `fromStart` belongs to a `SELECT *` (or `SELECT
 * DISTINCT|ALL *`) list. No preceding SELECT means invalid SQL, which errors
 * either way — the explicit inner is the superset choice there.
 */
function ownerIsStar(
  query: string,
  ownerSelectEnd: number,
  fromStart: number,
): boolean {
  if (ownerSelectEnd === -1) return false;
  return /^\s*(DISTINCT\s+|ALL\s+)?\*\s*$/.test(
    query.slice(ownerSelectEnd, fromStart),
  );
}
