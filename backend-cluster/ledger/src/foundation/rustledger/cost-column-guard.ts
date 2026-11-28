import type { QueryResult } from "@rustledger/wasm";

/**
 * The bare `cost` column (w31/163).
 *
 * Stock beanquery 0.2.0 has no `cost` column. rustledger 0.24.0 has one, and
 * on a reduction it reads the lot's cost without its sign: `-2 VTI {100.00
 * USD}` reads `200.00 USD` where `cost(position)` and `weight` read `-200.00
 * USD`, and a short opening does the same. So `sum(cost)` adds every sale to
 * the cost basis instead of taking it off. Refused before the query runs,
 * naming `cost(position)`. Not a rewrite to `cost(position)`: that call reads
 * a posting held without cost as its units, where the column reads NULL, so
 * `WHERE cost IS NOT NULL` or `count(cost)` would silently change meaning,
 * and the engine has no expression that is signed and NULL in the same rows.
 *
 * Which `cost` words are the column, on the engine text (the case fold has
 * run, and the engine resolves column names exactly, so only the lowercase
 * spelling reaches it):
 *
 * - A call (`cost(position)`, `cost(sum(position))`), an alias declaration
 *   (`number * cost_number AS cost`), the `AT cost` of `BALANCES` and
 *   `JOURNAL`, an attribute (`position.cost`), a longer name (`cost_number`),
 *   and string literals and slash-star block comments are not.
 * - In `GROUP BY`, `ORDER BY`, `HAVING` and `PIVOT BY`, a query that declares
 *   `AS cost` reads its alias, as the engine does. In its `SELECT` list and
 *   `WHERE` the word is still the column (the engine resolves aliases only in
 *   those four clauses), so `sum(cost) AS cost` is refused.
 * - A query that reads `FROM (SELECT …)` reads the subquery's columns, and a
 *   subquery can only output `cost` by naming it. The subquery's own words
 *   are judged in their own scope.
 *
 * Remove once the engine signs the column (or drops it); the live check in
 * `scripts/verify-rustledger.ts` shows when.
 */
const IDENT = /[A-Za-z_][\w$]*/y;
const ALIAS_CLAUSES = new Set(["group", "order", "having", "pivot"]);
const CLAUSES = new Set([
  "select",
  "from",
  "where",
  "group",
  "order",
  "having",
  "pivot",
  "limit",
]);

type Scope = {
  depth: number;
  clause: string;
  aliases: Set<string>;
  readsSubquery: boolean;
};

/** The query error for a bare `cost` column, or `undefined`. */
export function costColumnError(query: string): QueryResult | undefined {
  if (!mentionsCostColumn(query)) return undefined;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message:
          "The `cost` column is not supported by this query engine: on a sale or short it reads the lot's cost without its minus sign (-2 VTI {100.00 USD} reads 200.00 USD), so sum(cost) adds sales to the cost basis. Stock beanquery has no cost column either. Use cost(position) for a posting's signed cost (a posting held without cost reads its units, so add WHERE cost_number IS NOT NULL to keep only lots), or number * cost_number for the signed cost number.",
        code: null,
        phase: "query",
        hint: "Replace `cost` with `cost(position)`, and add WHERE cost_number IS NOT NULL to keep only postings held at cost.",
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

function mentionsCostColumn(query: string): boolean {
  if (!/\bcost\b/.test(query)) return false;
  // The outermost scope also holds a statement with no SELECT (BALANCES).
  const stack: Scope[] = [newScope(0)];
  const mentions: { scope: Scope; clause: string }[] = [];
  let depth = 0;
  let previous = "";
  let i = 0;
  while (i < query.length) {
    const ch = query[i] as string;
    const top = stack[stack.length - 1] as Scope;
    if (ch === "'" || ch === '"') {
      // No escapes: the next matching quote ends the literal.
      const end = query.indexOf(ch, i + 1);
      i = end === -1 ? query.length : end + 1;
      previous = "";
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      const end = query.indexOf("*/", i + 2);
      i = end === -1 ? query.length : end + 2;
      continue;
    }
    if (ch === "(" || ch === ")") {
      depth += ch === "(" ? 1 : -1;
      while (
        stack.length > 1 &&
        (stack[stack.length - 1] as Scope).depth > depth
      ) {
        stack.pop();
      }
      previous = "";
      i += 1;
      continue;
    }
    // A digit run or a `.`-led tail (`1.5`, `2026-01-01`, `.cost`) is one
    // token, never a word start: `position.cost` is an attribute.
    if (/[0-9.]/.test(ch)) {
      while (i < query.length && /[\w.$]/.test(query[i] as string)) i += 1;
      previous = "";
      continue;
    }
    IDENT.lastIndex = i;
    const ident = IDENT.exec(query);
    if (ident === null) {
      if (!/\s/.test(ch)) previous = "";
      i += 1;
      continue;
    }
    const text = ident[0];
    const lower = text.toLowerCase();
    const end = i + text.length;
    if (lower === "select") {
      if (top.depth === depth) {
        top.clause = "select";
      } else {
        if (top.clause === "from") top.readsSubquery = true;
        stack.push(newScope(depth));
      }
    } else if (CLAUSES.has(lower) && top.depth === depth) {
      top.clause = lower;
    } else if (previous === "as") {
      top.aliases.add(text);
    } else if (text === "cost" && previous !== "at" && !isCall(query, end)) {
      mentions.push({ scope: top, clause: top.clause });
    }
    previous = lower;
    i = end;
  }
  return mentions.some(
    ({ scope, clause }) =>
      !scope.readsSubquery &&
      !(ALIAS_CLAUSES.has(clause) && scope.aliases.has("cost")),
  );
}

function newScope(depth: number): Scope {
  return { depth, clause: "", aliases: new Set(), readsSubquery: false };
}

/** Whether the word is a function name: its next non-space character is `(`. */
function isCall(query: string, end: number): boolean {
  let i = end;
  while (i < query.length && /\s/.test(query[i] as string)) i += 1;
  return query[i] === "(";
}
