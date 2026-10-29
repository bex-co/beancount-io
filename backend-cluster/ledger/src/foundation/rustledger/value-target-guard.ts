import type { QueryResult } from "@rustledger/wasm";
import { callArgSpans } from "./bql-call-args";

/**
 * The currency target of the two-argument `value(position, 'CCY')`
 * (w23/184).
 *
 * rustledger 0.24.0 converts when the target is a currency with a price path,
 * but a target it cannot resolve — `'BOGUS'`, a lowercase `'usd'`, a code the
 * ledger never names — is silently ignored and the units come back, so the
 * column reads as a valuation that never happened. Same rule as the report
 * `conversion` check (w23/156): a literal target the ledger does not know is
 * refused before the query runs, listing the currencies it does. The check is
 * necessary-not-sufficient on purpose — a known currency with no price path
 * still degrades to units (the disclosure half, w23/180) — so it can never
 * refuse a conversion that works.
 *
 * Only literal targets are judged: a column, an expression, or a date
 * (`value(position, date('2025-01-01'))`, which stock blesses) abstains. The
 * scan skips string literals when looking for the call, so a narration that
 * says `value(x, 'y')` is not a call. Remove once the engine refuses the
 * target itself; the live check in `scripts/verify-rustledger.ts` shows when.
 */
const LITERAL = /^(?:'([^']*)'|"([^"]*)")$/;

/** Literal currency targets of every two-argument `value(…)` call, in order. */
export function valueCurrencyTargets(query: string): string[] {
  const targets: string[] = [];
  for (const args of callArgSpans(query, "value")) {
    if (args.length !== 2) continue;
    const second = query.slice(args[1].start, args[1].end).trim();
    const literal = LITERAL.exec(second);
    const code = literal?.[1] ?? literal?.[2];
    if (code !== undefined) targets.push(code);
  }
  return targets;
}

/**
 * The query error for a `value()` target the ledger does not know, or
 * `undefined`. `known` is read lazily: only a query with a literal target
 * pays for the commodity scan.
 */
export function valueTargetError(
  query: string,
  known: () => ReadonlySet<string>,
): QueryResult | undefined {
  const targets = valueCurrencyTargets(query);
  if (targets.length === 0) return undefined;
  const commodities = known();
  const unknown = targets.find((target) => !commodities.has(target));
  if (unknown === undefined) return undefined;
  const list = [...commodities].sort();
  const shown =
    list.length === 0
      ? ""
      : ` (${list.slice(0, 10).join(", ")}${list.length > 10 ? ", …" : ""})`;
  return {
    columns: [],
    rows: [],
    errors: [
      {
        message: `value() target "${unknown}" is not a currency in this ledger${shown}: this query engine ignores such a target and returns the unconverted units. Pass a currency code the ledger names, in its exact case.`,
        code: null,
        phase: "query",
        hint: "Pass a currency the ledger names, exactly as spelled (for example 'USD'), or drop the second argument for the operating-currency valuation.",
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
