import { BadUserInputError } from "@/shared/errors";
import type { QueryResult } from "@rustledger/wasm";
import { selectClauses } from "./bql-select-aliases";

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
  // a function argument or a computed column.
  const misused = mentions > bare.length;
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
