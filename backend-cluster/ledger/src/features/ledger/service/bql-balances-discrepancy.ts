import { BadUserInputError } from "@/shared/errors";
import type { QueryResult } from "@rustledger/wasm";
import type { QueryWord } from "./bql-select-aliases";
import { selectClauses, splitTopLevel } from "./bql-select-aliases";

/**
 * `balances.discrepancy` (w23/196, m19).
 *
 * The pinned engine never fills the column: a failing assertion reads NULL
 * where stock reports the difference. The service has the figure (the
 * validator's, the one the journal already serves), but a query result row
 * names its assertion only through `date`, `account` and `amount`, so those
 * are added to the query as hidden columns, the cell is filled from the
 * validator's differences, and the hidden columns are dropped again.
 *
 * Only a row-by-row projection can be answered that way. `discrepancy` used
 * to filter, order, group or aggregate would be evaluated by the engine over
 * NULL and answer silently wrong, so it is refused with the supported form.
 */
export type DiscrepancyPlan =
  | { kind: "none" }
  | {
      kind: "fill";
      /** The query to run: the user's, with the key columns appended. */
      query: string;
      /** How many key columns the rewrite appended (0 for `SELECT *`). */
      hidden: number;
      /** Result positions of the visible columns to fill. */
      columns: number[] | "named";
    };

const SUPPORTED =
  "Select discrepancy as a plain column of a query without GROUP BY or aggregates, for example SELECT date, account, amount, discrepancy FROM balances; this engine does not compute it for filters, ordering, grouping or functions.";

const AGGREGATE =
  /\b(?:sum|count|min|max|avg|first|last|only|any_value|every)\s*\(/i;
const BARE_DISCREPANCY = /^discrepancy(?:\s+as\s+[A-Za-z_][\w$]*)?$/i;
const FROM_BALANCES = /^\s*#?\s*balances\b/i;
const REDUNDANT_ALIAS = /^discrepancy\s+as\s+discrepancy$/i;
const BARE_ALIAS = /^discrepancy\s+as\s+([A-Za-z_][\w$]*)$/i;

/**
 * Bare items aliased back onto `discrepancy`: each contributes its own head
 * mention plus the alias, so both are explained and the projection fills.
 */
function redundantAliasSelfMentions(trimmed: string[]): number {
  return trimmed.filter((item) => REDUNDANT_ALIAS.test(item)).length;
}

/**
 * True when an alias of a bare `discrepancy` projection is read anywhere but
 * in the item that defines it: `ORDER BY d`, `WHERE d IS NOT NULL`, or even a
 * later SELECT item. Item spans come from re-walking the lossless comma split,
 * so the defining occurrence itself never counts. The one forgiven occurrence
 * is the table name after FROM (`AS balances ... FROM balances` aliases the
 * column, not the table).
 */
function leaksDiscrepancyAlias(
  words: QueryWord[],
  items: string[],
  listStart: number,
  tableWord: QueryWord | undefined,
): boolean {
  const spans: Array<{ start: number; end: number }> = [];
  let cursor = listStart;
  for (const item of items) {
    spans.push({ start: cursor, end: cursor + item.length });
    cursor += item.length + 1;
  }
  for (let i = 0; i < items.length; i += 1) {
    const alias = BARE_ALIAS.exec((items[i] as string).trim())?.[1];
    if (alias === undefined || alias.toLowerCase() === "discrepancy") continue;
    const span = spans[i] as { start: number; end: number };
    for (const word of words) {
      if (word.text.toLowerCase() !== alias.toLowerCase()) continue;
      if (word.start >= span.start && word.end <= span.end) continue;
      if (tableWord !== undefined && word.start === tableWord.start) continue;
      return true;
    }
  }
  return false;
}

/**
 * True when a depth-0 ORDER BY term addresses a bare `discrepancy` SELECT item
 * by 1-based position (`ORDER BY 4`, with or without a direction). Positions
 * cannot be resolved once `*` expands on the engine, so a wildcard list is
 * left to the engine — and to the named check above.
 */
function ordersByDiscrepancyPosition(
  query: string,
  words: QueryWord[],
  trimmed: string[],
  listEnd: number,
): boolean {
  if (trimmed.some((item) => item === "*")) return false;
  const orderAt = words.findIndex(
    (word, index) =>
      word.depth === 0 &&
      word.start >= listEnd &&
      word.text.toLowerCase() === "order" &&
      words[index + 1]?.depth === 0 &&
      words[index + 1]?.text.toLowerCase() === "by",
  );
  if (orderAt === -1) return false;
  const clauseStart = (words[orderAt + 1] as QueryWord).end;
  const cut = words.find(
    (word) =>
      word.depth === 0 &&
      word.start >= clauseStart &&
      /^(?:from|where|group|order|limit|having|pivot)$/i.test(word.text),
  );
  const clause = query.slice(clauseStart, cut?.start ?? query.length);
  return splitTopLevel(clause).some((term) => {
    const position = /^\s*[+-]?(\d+)\b/.exec(term);
    if (!position) return false;
    const index = Number(position[1]) - 1;
    return (
      index >= 0 &&
      index < trimmed.length &&
      BARE_DISCREPANCY.test(trimmed[index] as string)
    );
  });
}

/** Decides how a query reading `balances.discrepancy` is answered. */
export function planDiscrepancy(query: string): DiscrepancyPlan {
  const clauses = selectClauses(query);
  if (clauses === undefined) return { kind: "none" };
  const { words, items, start, end } = clauses;

  const from = words.find(
    (word) => word.depth === 0 && word.text.toLowerCase() === "from",
  );
  if (from === undefined || !FROM_BALANCES.test(query.slice(from.end)))
    return { kind: "none" };

  const trimmed = items.map((item) => item.trim());
  const wildcard = trimmed.length === 1 && trimmed[0] === "*";
  const bare = trimmed.filter((item) => BARE_DISCREPANCY.test(item));
  const mentions = words.filter(
    (word) => word.text.toLowerCase() === "discrepancy",
  ).length;
  if (!wildcard && mentions === 0) return { kind: "none" };

  const grouped = words.some(
    (word) => word.depth === 0 && /^(?:group|pivot|having)$/i.test(word.text),
  );
  const distinct = /^\s*distinct\b/i.test(query.slice(start, end));
  const aggregated = AGGREGATE.test(query.slice(start, end));
  // `discrepancy` anywhere but as a bare SELECT item: a filter, an ordering,
  // a function argument or a computed column. An alias of a bare projection
  // (`AS d` then `ORDER BY d` or `WHERE d IS NOT NULL`) and a SELECT position
  // holding one (`ORDER BY 4`) reach the same NULL cell without naming it, so
  // they refuse the same way; a redundant alias (`AS discrepancy`) still names
  // the plain projection and fills.
  const fromIndex = words.indexOf(from);
  const misused =
    mentions > bare.length + redundantAliasSelfMentions(trimmed) ||
    leaksDiscrepancyAlias(words, items, start, words[fromIndex + 1]) ||
    ordersByDiscrepancyPosition(query, words, trimmed, end);
  if (misused || (mentions > 0 && (grouped || distinct || aggregated))) {
    throw new BadUserInputError(
      `Invalid BQL query: balances.discrepancy cannot be used here. ${SUPPORTED}`,
      "query",
    );
  }
  if (grouped || distinct || aggregated) return { kind: "none" };

  if (wildcard) {
    return { kind: "fill", query, hidden: 0, columns: "named" };
  }
  const insertAt = query.slice(0, end).trimEnd().length;
  const rewritten = `${query.slice(0, insertAt)}, date, account, amount${query.slice(insertAt)}`;
  const columns = trimmed.flatMap((item, index) =>
    BARE_DISCREPANCY.test(item) ? [index] : [],
  );
  return { kind: "fill", query: rewritten, hidden: 3, columns };
}

type Diff = { number: string; currency: string };

/** The key under which a failed assertion's difference is looked up. */
export function discrepancyKey(
  date: unknown,
  account: unknown,
  amount: unknown,
): string | undefined {
  if (typeof date !== "string" || typeof account !== "string") return undefined;
  const a = amount as { number?: unknown; currency?: unknown } | null;
  if (a === null || typeof a !== "object") return undefined;
  if (typeof a.number !== "string" || typeof a.currency !== "string")
    return undefined;
  return JSON.stringify([date, account, a.currency, a.number]);
}

/**
 * Fills the `discrepancy` cells from the validator's differences and drops the
 * key columns the rewrite added. A row whose assertion passed keeps NULL.
 */
export function applyDiscrepancy(
  result: QueryResult,
  plan: Extract<DiscrepancyPlan, { kind: "fill" }>,
  diffs: ReadonlyMap<string, Diff>,
): QueryResult {
  const width = result.columns.length;
  const visible = width - plan.hidden;
  const at =
    plan.columns === "named"
      ? {
          date: result.columns.indexOf("date"),
          account: result.columns.indexOf("account"),
          amount: result.columns.indexOf("amount"),
        }
      : { date: visible, account: visible + 1, amount: visible + 2 };
  const targets =
    plan.columns === "named"
      ? [result.columns.indexOf("discrepancy")].filter((i) => i >= 0)
      : plan.columns;
  if (at.date < 0 || at.account < 0 || at.amount < 0) return result;

  const rows = result.rows.map((row) => {
    const diff = diffs.get(
      discrepancyKey(row[at.date], row[at.account], row[at.amount]) ?? "",
    );
    const next = row.slice(0, visible);
    if (diff !== undefined) for (const i of targets) next[i] = diff;
    return next;
  });
  return {
    ...result,
    columns: result.columns.slice(0, visible),
    rows,
  };
}
