import type { QueryResult } from "@rustledger/wasm";

/**
 * Bare non-grouped columns under `GROUP BY` (w23/131).
 *
 * rustledger 0.24.0 answers `SELECT account, date … GROUP BY account` with
 * each group's first-row date — silently arbitrary (the group's postings
 * span many dates) — while stock beanquery refuses (`all non-aggregates
 * must be covered by GROUP-BY clause`). The pick is row-consistent and
 * stable under ORDER BY / HAVING, so the arbitrary value propagates
 * through the whole query. Refused before the query runs, naming the
 * uncovered columns and the explicit `first()` spelling (which exists on
 * both sides and is byte-identical to the pick).
 *
 * The guard fires ONLY on proven bare-column violations, and abstains
 * everywhere else — a false negative keeps the status quo, never refuses
 * a working query:
 *
 * - Single query level only: subqueries without their own GROUP BY are
 *   stripped first (positions preserved), and anything still holding two
 *   SELECTs — nested grouping — abstains.
 * - Only bare-column items can fire (single identifier, optionally
 *   dotted, after AS-alias and DISTINCT/ALL stripping). Aggregates
 *   (`count`, `sum`, `min`, `max`, `first`, `last` — the complete stock
 *   0.2.0 inventory, read from its `EvalAggregator` subclasses),
 *   constants, and every other expression shape abstain. In particular
 *   `length(account)` stays working: deterministic and benign.
 * - A bare item is covered by a textual key, an alias it defines that a
 *   key names, or an ordinal resolving to its position (dotted names
 *   match liberally on either side). Constants, ORDER BY, HAVING, and
 *   `*` are unchecked even though stock is stricter there: constants
 *   and key filters are harmless, ORDER BY picks are deterministic, and
 *   the engine already refuses bare HAVING refs, stars, and bad
 *   ordinals loudly (all verified live).
 *
 * Remove once the engine validates GROUP-BY coverage; the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const AGGREGATES = ["count", "sum", "min", "max", "first", "last"] as const;
const GROUP_BY = /\bgroup\s+by\b/i;
const KEY_LIST_END = /\b(?:having|order\s+by|limit|offset)\b|\)|;/i;
const SELECT_SPAN =
  /\bselect\b([\s\S]*?)(?:\bfrom\b|\bwhere\b|\bgroup\s+by\b|\bhaving\b|\border\s+by\b|\blimit\b|\boffset\b|;|$)/i;
const PLAIN_PARENS = /\([^()]*\)/g;
const AS_ALIAS = /^(.*?)\s+as\s+([A-Za-z_]\w*)$/i;
const BARE_COLUMN = /^(?:[A-Za-z_]\w*\.)?[A-Za-z_]\w*$/;
const CONSTANT = /^(?:\d+(?:\.\d+)?|''|null|true|false)$/i;

/** The query error for uncovered bare GROUP-BY columns, or `undefined`. */
export function groupByCoverageError(query: string): QueryResult | undefined {
  // Literals and block comments may narrate grouping queries.
  const unquoted = query
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!GROUP_BY.test(unquoted)) return undefined;
  // Subqueries without their own grouping cannot hold a violation;
  // grouped ones keep the query multi-level, which abstains below.
  let stripped = unquoted;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = stripped.replace(PLAIN_PARENS, (group) =>
      /\bselect\b/i.test(group) && !GROUP_BY.test(group) ? "" : group,
    );
    if (next === stripped) break;
    stripped = next;
  }
  if ((stripped.match(/\bselect\b/gi) ?? []).length !== 1) return undefined;
  const keyLists = [...stripped.matchAll(/\bgroup\s+by\b/gi)].map((m) => {
    const rest = stripped.slice((m.index as number) + m[0].length);
    const end = rest.search(KEY_LIST_END);
    return end === -1 ? rest : rest.slice(0, end);
  });
  const items = splitTopLevel(
    SELECT_SPAN.exec(stripped)?.[1] ?? "",
  ).map((item, index) =>
    index === 0 ? item.replace(/^(?:distinct|all)\s+/i, "") : item,
  );
  const uncovered = items.filter(
    (item, index) => isBareColumn(item) && !isCovered(item, index, keyLists),
  );
  if (uncovered.length === 0) return undefined;
  const exprs = uncovered.map((item) => splitAlias(item).expr);
  const names = exprs.map((expr) => `"${expr}"`).join(", ");
  const firsts = exprs.map((expr) => `first(${expr})`).join(", ");
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `Bare column ${names} is not grouped and not aggregated: this query engine would silently report each group's first-row value. Add ${names} to GROUP BY, aggregate it, or name the pick explicitly with ${firsts}.`,
        code: null,
        phase: "query",
        hint: `Group by ${names}, aggregate it, or wrap it in first().`,
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

/** A select item split into its expression and AS alias halves. */
function splitAlias(item: string): { expr: string; alias: string } {
  const m = AS_ALIAS.exec(item);
  return m
    ? { expr: (m[1] as string).trim(), alias: m[2] as string }
    : { expr: item.trim(), alias: "" };
}

/** Whether a select item is a bare column (only these can fire). */
function isBareColumn(item: string): boolean {
  const { expr } = splitAlias(item);
  if (
    new RegExp(`^(?:${AGGREGATES.join("|")})\\s*\\(`, "i").test(expr) ||
    CONSTANT.test(expr)
  ) {
    return false;
  }
  return BARE_COLUMN.test(expr);
}

/** Whether a bare item is covered by name, alias, or ordinal. */
function isCovered(item: string, index: number, keyLists: string[]): boolean {
  const { expr, alias } = splitAlias(item);
  const names = new Set(
    [expr, alias]
      .filter((n) => n !== "")
      .flatMap((n) => [n.toLowerCase(), lastSegment(n)]),
  );
  return keyLists.some((list) =>
    splitTopLevel(list).some((key) => {
      const trimmed = key.trim();
      if (/^\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed, 10) - 1 === index;
      }
      return (
        names.has(trimmed.toLowerCase()) || names.has(lastSegment(trimmed))
      );
    }),
  );
}

/** A possibly dotted name's last segment, lowercased. */
function lastSegment(name: string): string {
  return (name.split(".").pop() as string).toLowerCase();
}
