import BigNumber from "bignumber.js";
import { matchesAccountPattern } from "./account-matcher";
import { resolveConversionTarget } from "./report-conversion";

/**
 * Holdings groups composed from one fixed BQL detail query, mirroring
 * `bea report holdings` (`cli/src/bea_engine/report.py`).
 *
 * Fava's API has no holdings endpoint and its hierarchy balances aggregate
 * cost without the per-lot linkage, so the service asks the same question
 * the dashboard's holdings page asks — per-(account, commodity, cost
 * currency) units, book value, market value, and quote — and groups the
 * rows here, where the CLI's exact account matcher and grouping rules
 * apply. Quotes pin at `today()`, the BQL the dashboard proves; entry
 * time-scoping has no BQL form, so this read takes no `time` input.
 */

export type HoldingsGrouping = "account" | "commodity";

type HoldingsMoney = { number: string; currency: string };

type HoldingsGroup = {
  account?: string;
  accounts?: string[];
  commodity: string;
  units: HoldingsMoney;
  average_cost: HoldingsMoney;
  cost_basis: HoldingsMoney;
  market_value: HoldingsMoney;
  price: HoldingsMoney | null;
};

export type HoldingsResult = {
  group_by: HoldingsGrouping;
  groups: HoldingsGroup[];
  totals: {
    cost_basis: Record<string, string>;
    market_value: Record<string, string>;
  };
  valuation: "complete" | "partial";
  missing_prices: { from: string; to: string }[];
  missing_price_summary: string[];
  /** ISO date the quotes pin at (`today()` in the detail query). */
  as_of: string;
};

type HoldingsColumn =
  | "account"
  | "currency"
  | "cost_currency"
  | "units"
  | "book_value"
  | "market_value"
  | "price"
  | "conv_rate";

/**
 * The detail query. Fixed text apart from the conversion leg, whose target
 * is a validated commodity code — the only interpolation, and it cannot
 * carry a quote or backslash. `first()` wraps the quote lookups because
 * BQL aggregates every selected expression; each group holds one
 * (commodity, cost currency), so the first row's quote is the group's.
 */
export function holdingsDetailQuery(conversionTarget: string | null): string {
  const leg =
    conversionTarget === null
      ? ""
      : `, first(getprice(cost_currency, "${conversionTarget}", today())) AS conv_rate`;
  return (
    "SELECT account, currency, cost_currency, units(sum(position)) AS units, " +
    "cost(sum(position)) AS book_value, value(sum(position), today()) AS market_value, " +
    `first(getprice(currency, cost_currency, today())) AS price${leg} ` +
    "GROUP BY account, currency, cost_currency " +
    "ORDER BY account, currency, cost_currency"
  );
}

/**
 * Resolve the conversion target: an explicit currency, `units` for none,
 * or the ledger's single operating currency when omitted — the CLI's
 * default. The BQL path cannot honor Fava's cost/value modes, so only
 * `units` joins currencies here.
 */
export function resolveHoldingsConversion(
  conversion: string | undefined,
  operatingCurrencies: string[],
): string | null {
  return resolveConversionTarget(conversion, operatingCurrencies, []);
}

type BqlCell = string | number | boolean | null | Record<string, unknown>;

/** One decimal out of a `{ currency: "number" }` money map, or null. */
function moneyIn(cell: BqlCell | undefined, currency: string): string | null {
  if (typeof cell !== "object" || cell === null || Array.isArray(cell)) {
    return null;
  }
  const raw = cell[currency];
  if (typeof raw !== "string" || raw === "") return null;
  try {
    return new BigNumber(raw).toString();
  } catch {
    return null;
  }
}

/** A quote cell (Decimal renders as a JSON number) as a decimal string. */
function quoteIn(cell: BqlCell | undefined): string | null {
  if (typeof cell === "number") {
    return Number.isFinite(cell) ? String(cell) : null;
  }
  if (typeof cell === "string" && cell !== "") {
    try {
      return new BigNumber(cell).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Plain decimal notation: `toString()` may answer `1e-7` at the extremes. */
function plain(value: BigNumber): string {
  const text = value.toString();
  return /[eE]/.test(text) ? value.toFixed() : text;
}

export function composeHoldings(params: {
  columns: string[];
  rows: BqlCell[][];
  groupBy: HoldingsGrouping;
  account: string | undefined;
  roots: readonly string[];
  conversionTarget: string | null;
  asOf: string;
}): HoldingsResult {
  const { columns, rows, groupBy, account, roots, conversionTarget, asOf } =
    params;
  const at = (name: HoldingsColumn): number => columns.indexOf(name);
  // (scope..., commodity, cost currency) -> [units, cost basis, accounts,
  // market value, price]. The CLI's lot table, keyed the same way.
  const lots = new Map<string, [BigNumber, BigNumber, Set<string>, BigNumber, string | null]>();
  const keyOf = (scope: string[], commodity: string, held: string): string =>
    JSON.stringify([...scope, commodity, held]);
  const missing = new Map<string, { from: string; to: string }>();
  const miss = (from: string, to: string): void => {
    missing.set(`${from}→${to}`, { from, to });
  };

  for (const row of rows) {
    const name = row[at("account")];
    const commodity = row[at("currency")];
    const held = row[at("cost_currency")];
    if (
      typeof name !== "string" ||
      name === "" ||
      typeof commodity !== "string" ||
      commodity === "" ||
      typeof held !== "string" ||
      held === ""
    ) {
      continue;
    }
    if (account !== undefined && !matchesAccountPattern(account, name, roots)) {
      continue;
    }
    // Costless lots are cash, not holdings — same exclusion as the CLI.
    const units = moneyIn(row[at("units")], commodity);
    const basis = moneyIn(row[at("book_value")], held);
    const market = moneyIn(row[at("market_value")], held);
    if (units === null || basis === null || market === null) continue;
    const unitsBN = new BigNumber(units);
    if (unitsBN.isZero()) continue;
    let price = quoteIn(row[at("price")]);
    if (price === null) miss(commodity, held);
    let basisBN = new BigNumber(basis);
    let marketBN = new BigNumber(market);
    let converted = false;
    if (conversionTarget !== null && conversionTarget !== held) {
      const rate = quoteIn(row[at("conv_rate")]);
      if (rate === null) {
        miss(held, conversionTarget);
      } else {
        const rateBN = new BigNumber(rate);
        basisBN = basisBN.times(rateBN);
        marketBN = marketBN.times(rateBN);
        price = price === null ? null : plain(new BigNumber(price).times(rateBN));
        converted = true;
      }
    }
    const key = keyOf(
      groupBy === "account" ? [name] : [],
      commodity,
      converted ? conversionTarget! : held,
    );
    const found = lots.get(key);
    if (found === undefined) {
      lots.set(key, [unitsBN, basisBN, new Set([name]), marketBN, price]);
    } else {
      found[0] = found[0].plus(unitsBN);
      found[1] = found[1].plus(basisBN);
      found[2].add(name);
      found[3] = found[3].plus(marketBN);
      // One quote per (commodity, held) pair, so merged rows agree; a
      // disagreement keeps the first rather than inventing a blend.
    }
  }

  const groups: HoldingsGroup[] = [];
  const totals = {
    cost_basis: new Map<string, BigNumber>(),
    market_value: new Map<string, BigNumber>(),
  };
  const total = (column: keyof typeof totals, currency: string, value: BigNumber): void => {
    totals[column].set(
      currency,
      (totals[column].get(currency) ?? new BigNumber(0)).plus(value),
    );
  };
  const ordered = [...lots.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [key, [unitsBN, basisBN, accounts, marketBN, price]] of ordered) {
    if (unitsBN.isZero()) continue;
    const parts = JSON.parse(key) as string[];
    const heldCurrency = parts[parts.length - 1]!;
    const commodity = parts[parts.length - 2]!;
    const average = plain(basisBN.dividedBy(unitsBN));
    const group: HoldingsGroup = {
      ...(groupBy === "account"
        ? { account: parts[0]! }
        : { accounts: [...accounts].sort() }),
      commodity,
      units: { number: plain(unitsBN), currency: commodity },
      average_cost: { number: average, currency: heldCurrency },
      cost_basis: { number: plain(basisBN), currency: heldCurrency },
      market_value: { number: plain(marketBN), currency: heldCurrency },
      price: price === null ? null : { number: price, currency: heldCurrency },
    };
    groups.push(group);
    total("cost_basis", heldCurrency, basisBN);
    total("market_value", heldCurrency, marketBN);
  }

  const legs = [...missing.values()].sort((a, b) =>
    a.from < b.from || (a.from === b.from && a.to < b.to) ? -1 : 1,
  );
  return {
    group_by: groupBy,
    groups,
    totals: {
      cost_basis: Object.fromEntries(
        [...totals.cost_basis.entries()].map(([code, value]) => [code, plain(value)]),
      ),
      market_value: Object.fromEntries(
        [...totals.market_value.entries()].map(([code, value]) => [code, plain(value)]),
      ),
    },
    valuation: legs.length > 0 ? "partial" : "complete",
    missing_prices: legs,
    missing_price_summary: legs.map(
      ({ from, to }) => `${from} has no ${to} quote at ${asOf}; valued at cost`,
    ),
    as_of: asOf,
  };
}
