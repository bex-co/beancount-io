import type { QueryResult } from "@rustledger/wasm";

/**
 * `=` / `!=` on composite BQL values (w23/128, extended w23/152).
 *
 * rustledger 0.24.0 evaluates same-type composite equality but always
 * answers it wrong: `tags = tags`, `position = position`,
 * `balance = balance`, `cost(x) = cost(x)`, `meta = meta`,
 * `entry = entry`, `weight = weight`, `price = price`,
 * `amount = amount`, `other_accounts = other_accounts`, and
 * `accounts = accounts` read constant-False (constant-True for `!=`,
 * NULL for costless `price`) — even `x = x` on the same row — while
 * stock beanquery refuses the comparison at compile time
 * (`operator "equal(set, set)" not supported`). Stock refuses when
 * EITHER side is composite, so the guard fires on either side too.
 * Inequalities need no guard: the engine already answers them with a
 * loud type error.
 *
 * Operand heads resolve syntactically, which bounds the guard:
 *
 * - Bare or dotted composite columns (`tags`, `links`, `position`,
 *   `balance`, `meta`, `entry`, `weight`, `price`, `amount`,
 *   `other_accounts`, `accounts`) — every same-named column on every
 *   stock table carrying it is composite, verified against beanquery
 *   0.2.0 (`weight`/`price`/`other_accounts` postings-only amounts and
 *   sets; `amount` on balances/prices; `accounts` on
 *   entries/postings/transactions). A name shadowed by an `AS <name>`
 *   alias anywhere in the query is skipped, since the alias may retype
 *   it; subquery aliases the guard cannot see through stay a false
 *   negative (the status quo), never a false positive.
 * - `cost(` / `value(` calls, which always return amounts.
 * - `sum` / `min` / `max` / `first` / `last` over a composite argument
 *   (one nesting level: a composite column or a `cost(`/`value(` call).
 *   `count(` is deliberately absent — it returns a number.
 *
 * `open` / `close` are deliberately absent: the engine answers their
 * self-equality correctly (true), so refusing them would regress working
 * answers toward stock's capability gap. `<>` / `==` need no guard —
 * both are loud syntax errors on each side. Only SELECT statements are
 * scanned. Remove once the engine refuses composite equality; the live
 * check in `scripts/verify-rustledger.ts` shows when.
 */
const COMPOSITE_COLUMNS = [
  "tags",
  "links",
  "position",
  "balance",
  "meta",
  "entry",
  "weight",
  "price",
  "amount",
  "other_accounts",
  "accounts",
] as const;
const COMPOSITE_FUNCTIONS = ["cost", "value"] as const;
const COMPOSITE_AGGREGATES = ["sum", "min", "max", "first", "last"] as const;

const ALIAS_DEF = /\bas\s+([A-Za-z_]\w*)/gi;
const SELECT_STMT = /\bselect\b/i;

/** The query error for a composite `=` / `!=`, or `undefined`. */
export function compositeComparisonError(
  query: string,
): QueryResult | undefined {
  // String literals may compare text that names composite columns.
  const unquoted = query.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
  if (!SELECT_STMT.test(unquoted)) return undefined;
  const shadowed = new Set(
    [...unquoted.matchAll(ALIAS_DEF)].map((m) => (m[1] as string).toLowerCase()),
  );
  const columns = COMPOSITE_COLUMNS.filter((c) => !shadowed.has(c));
  if (columns.length === 0) return undefined;
  const col = `(?:${columns.join("|")})`;
  const dottedCol = String.raw`(?<![\w])(?:[A-Za-z_]\w*\.)?${col}\b(?!\s*\()(?!\.)`;
  // Calls consume through one paren level; deeper nesting (cost(value(x)))
  // is unrealistic BQL and stays a false negative.
  const func = String.raw`(?<![\w])(?:${COMPOSITE_FUNCTIONS.join("|")})\s*\([^()]*\)`;
  const argCol = String.raw`(?:[A-Za-z_]\w*\.)?${col}\b(?!\s*\()`;
  const aggregate = String.raw`(?<![\w])(?:${COMPOSITE_AGGREGATES.join("|")})\s*\(\s*(?:distinct\s+|all\s+)?(?:${argCol}|(?:${COMPOSITE_FUNCTIONS.join("|")})\s*\([^()]*\))[^()]*\)`;
  const operand = String.raw`(?:${dottedCol}|${func}|${aggregate})`;
  const equals = String.raw`(?:!=|(?<![<>=!])=(?!=))`;
  const compared = new RegExp(
    String.raw`${operand}\s*${equals}|${equals}\s*${operand}`,
    "i",
  );
  if (!compared.test(unquoted)) return undefined;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message:
          "Comparing composite BQL values (sets, positions, inventories, amounts, metadata, entries) with = or != is not supported by this query engine: it would silently answer False. Compare scalar values instead — lengths, numbers, or names — rather than the composite values.",
        code: null,
        phase: "query",
        hint: "Replace the composite comparison with scalar comparisons such as length(tags) or account names.",
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
