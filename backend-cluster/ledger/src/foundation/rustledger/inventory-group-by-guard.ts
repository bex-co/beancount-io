import type { QueryResult } from "@rustledger/wasm";

/**
 * `GROUP BY` over the inventory column (w23/129).
 *
 * rustledger 0.24.0 collapses `GROUP BY balance` into one group holding
 * every row — while `SELECT DISTINCT balance` finds each value and
 * `GROUP BY position` / `GROUP BY tags` group correctly — and stock
 * beanquery refuses the query (`GROUP-BY a non-hashable type is not
 * supported`). Refused before the query runs, naming the distinct-keys
 * form. Only the inventory column is refused: position and tags group
 * correctly on this engine, so refusing them would regress working
 * answers toward stock's capability gap.
 *
 * Two arms, both syntactic:
 *
 * - Named: `balance` (any case, optionally dotted, optionally
 *   parenthesized) inside a GROUP BY key list — the list ends at HAVING,
 *   ORDER BY, LIMIT, OFFSET, a closing paren, or a `;`, so a `balance` in
 *   a later clause never fires. Function calls are stripped first, so
 *   `GROUP BY str(balance)` does not fire (the engine refuses it
 *   itself). A name shadowed by an `AS balance` alias is skipped: the
 *   engine binds GROUP BY names to aliases, verified live.
 * - Ordinal: `GROUP BY <n>` where the query's own SELECT list item n is
 *   exactly `balance` (modulo case, whitespace, a `table.` prefix, and a
 *   DISTINCT/ALL modifier on item 1). Only when no parens survive call
 *   stripping — anything with a subquery abstains — and only a single
 *   SELECT, so the pairing is unambiguous. Anything else (aliases,
 *   expressions) abstains: a false negative keeps the status quo, never
 *   refuses a working query.
 *
 * `GROUP BY ALL` needs no guard — both sides answer it loud (`ALL` reads
 * as a missing column). Remove once the engine hashes inventories; the
 * live check in `scripts/verify-rustledger.ts` shows when.
 */
const GROUP_BY = /\bgroup\s+by\b/i;
const KEY_LIST_END = /\b(?:having|order\s+by|limit|offset)\b|\)|;/i;
const ORDINAL = /\b(\d+)\b/g;
const SELECT_ITEM =
  /\bselect\b([\s\S]*?)(?:\bfrom\b|\bgroup\s+by\b|\bhaving\b|\border\s+by\b|\blimit\b|;|$)/i;
const CALL_PARENS = /([A-Za-z_]\w*)(\s*\([^()]*\))/g;
// Keywords are never callees: without this, `BY (balance)` and
// `FROM (SELECT …)` read as calls and the strip eats the key list.
const CALL_KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "offset",
  "distinct",
  "all",
  "as",
  "and",
  "or",
  "not",
  "in",
  "is",
  "null",
  "asc",
  "desc",
  "join",
  "on",
  "union",
  "case",
  "when",
  "then",
  "else",
  "end",
  "exists",
  "between",
  "like",
]);

function stripCallsOnce(text: string): string {
  return text.replace(CALL_PARENS, (m, name: string) =>
    CALL_KEYWORDS.has(name.toLowerCase()) ? m : name,
  );
}
const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
// The inventory-typed columns: postings' `balance` and the MCP-only
// `account_balance` sibling, which collapses identically (w23/179).
const INVENTORY_COLUMNS = ["balance", "account_balance"] as const;
const bareColumn = (column: string) =>
  new RegExp(
    `(?<![\\w])(?:[A-Za-z_]\\w*\\.)?${column}\\b(?!\\s*\\()(?!\\.)`,
    "i",
  );
const exactColumn = (column: string) =>
  new RegExp(`^(?:[A-Za-z_]\\w*\\.)?${column}$`, "i");

/** The query error for an inventory `GROUP BY`, or `undefined`. */
export function inventoryGroupByError(query: string): QueryResult | undefined {
  // String literals may narrate a query that groups by balance.
  const unquoted = query.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  // Calls group by their scalar results, not by their arguments.
  const stripped = stripCallsOnce(stripCallsOnce(stripCallsOnce(unquoted)));
  if (!GROUP_BY.test(stripped)) return undefined;
  const shadowed = new Set(
    [...stripped.matchAll(ALIAS_DEF)].map((m) =>
      (m[1] as string).toLowerCase(),
    ),
  );
  const keyLists = [...stripped.matchAll(/\bgroup\s+by\b/gi)].map((m) => {
    const rest = stripped.slice((m.index as number) + m[0].length);
    const end = rest.search(KEY_LIST_END);
    return end === -1 ? rest : rest.slice(0, end);
  });
  const noParens = !/[()]/.test(stripped);
  const singleSelect = (stripped.match(/\bselect\b/gi) ?? []).length === 1;
  const column = INVENTORY_COLUMNS.find((name) => {
    const named =
      !shadowed.has(name) &&
      keyLists.some((list) => bareColumn(name).test(list));
    const ordinal =
      noParens &&
      singleSelect &&
      keyLists.some((list) => ordinalHitsColumn(stripped, list, name));
    return named || ordinal;
  });
  if (column === undefined) return undefined;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Grouping by the inventory column ${column} is not supported by this query engine: it would collapse every row into one group. List distinct inventories with SELECT DISTINCT ${column}, or group by a scalar column such as account, instead.`,
        code: null,
        phase: "query",
        hint: `Replace GROUP BY ${column} with SELECT DISTINCT ${column} or a scalar group key.`,
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

/** Whether an ordinal in a GROUP BY key list resolves to the bare column. */
function ordinalHitsColumn(
  stripped: string,
  keyList: string,
  column: string,
): boolean {
  const ordinals = [...keyList.matchAll(ORDINAL)].map((m) =>
    Number.parseInt(m[1] as string, 10),
  );
  if (ordinals.length === 0) return false;
  const items = SELECT_ITEM.exec(stripped)?.[1]?.split(",") ?? [];
  return ordinals.some((n) => {
    // Exact match only: an aliased or computed item abstains.
    const item = items[n - 1]?.trim().replace(/^(?:distinct|all)\s+/i, "");
    return item !== undefined && exactColumn(column).test(item);
  });
}
