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
 * apply. Quotes pin at today and come from the ledger's `price` directives
 * alone, the price source stock beancount and the statements use (w23/m41,
 * w1/229): the BQL engine also derives a price from every `@` annotation,
 * which valued a sold lot's remaining units at the sale price while the
 * balance sheet and net worth said the price was missing. Entry
 * time-scoping has no BQL form, so this read takes no `time` input.
 */

export type HoldingsGrouping = "account" | "commodity";

type HoldingsMoney = { number: string; currency: string };

type HoldingsGroup = {
  account?: string;
  accounts?: string[];
  commodity: string;
  units: HoldingsMoney;
  /**
   * Null when part of the group was bought with a price but no cost, or when
   * its long and short lots net to zero units (w5/947, w1/292).
   */
  average_cost: HoldingsMoney | null;
  cost_basis: HoldingsMoney | null;
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
  /** False when a group's basis is unknown: `totals.cost_basis` leaves it out. */
  cost_basis_complete: boolean;
  valuation: "complete" | "partial";
  missing_prices: { from: string; to: string }[];
  missing_price_summary: string[];
  /** ISO date the quotes are looked up at (today). */
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
  | "conv_rate"
  | "direct_price"
  | "price_date"
  | "direct_date";

/**
 * The detail query: units and book value per lot, so per-(account, commodity,
 * cost currency) lot group. Fixed text, no interpolation. A lot is one row so
 * that a sold one (zero units) is told apart from a long and a short lot that
 * are both still held and net to zero (w5/947, w1/292): the group's own net
 * units cannot tell them apart. The market value and the quotes are not asked
 * of the engine; {@link valueHoldingRows} derives them from the price
 * directives, so the engine's implied prices never reach a holdings figure.
 */
export function holdingsDetailQuery(): string {
  const lot =
    "account, currency, cost_currency, cost_number, cost_date, cost_label";
  return (
    `SELECT ${lot}, units(sum(position)) AS units, ` +
    "cost(sum(position)) AS book_value " +
    `GROUP BY ${lot} ORDER BY ${lot}`
  );
}

/**
 * The ledger's explicit `price` directives, oldest first. Both stock beanquery
 * and the engine list only directives here, never an `@` annotation's implied
 * price (checked in the oracle fixtures, `scripts/bql-oracle`). The shell
 * drops a zero amount from its `{ currency: number }` cell, so the quote
 * currency rides alongside: `price DEAD 0 USD` is a quote of zero, not none
 * (w1/292).
 */
export const HOLDINGS_PRICES_QUERY =
  "SELECT date, currency, amount, currency(amount) AS quote FROM prices ORDER BY date";

/**
 * Every currency a posting price is quoted in. With the operating currencies,
 * the cost currencies, and the `price` directives' quote currencies, these are
 * the ledger's money: an uncosted balance in one is cash, not a holding
 * (w1/253, the CLI's `_money_currencies`).
 */
export const HOLDINGS_PRICE_CURRENCIES_QUERY =
  "SELECT DISTINCT currency(price) AS price_currency";

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

/**
 * One price row's `[quote currency, rate]` pairs. A zero rate's amount cell
 * comes back empty, so its currency is read from the `quote` column.
 */
function quotesOf(row: BqlCell[]): [string, string][] {
  const [, , amount, quote] = row;
  if (typeof amount !== "object" || amount === null || Array.isArray(amount)) {
    return [];
  }
  const pairs = Object.entries(amount).map(
    ([currency, number]): [string, string] => [currency, String(number)],
  );
  if (pairs.length === 0 && typeof quote === "string" && quote !== "") {
    return [[quote, "0"]];
  }
  return pairs;
}

/** A quote and the date of the directive it came from. */
type Quote = { date: string; rate: BigNumber };

/**
 * The latest quote on or before `asOf` for each pair, from the pair's own
 * directives or its inverse's. One entry per pair is kept, so a ledger with
 * years of daily quotes costs one pass, not a list per directive. A zero
 * quote counts, as in the CLI's price map: a delisted share quoted at `0 USD`
 * is worth nothing, not its cost or an older quote (w1/292). It has no
 * inverse, so the reverse pair keeps its previous rate.
 */
function priceLookup(priceRows: BqlCell[][], asOf: string) {
  const latest = new Map<string, Quote>();
  const keep = (base: string, quote: string, date: string, rate: BigNumber) => {
    const key = JSON.stringify([base, quote]);
    const current = latest.get(key);
    // Listed oldest first; of two on one day the later one wins.
    if (current === undefined || date >= current.date) {
      latest.set(key, { date, rate });
    }
  };
  for (const row of priceRows) {
    const [date, base] = row;
    if (typeof date !== "string" || date > asOf || typeof base !== "string") {
      continue;
    }
    for (const [quote, number] of quotesOf(row)) {
      const rate = new BigNumber(number);
      if (!rate.isFinite()) continue;
      keep(base, quote, date, rate);
      if (!rate.isZero()) {
        keep(quote, base, date, new BigNumber(1).dividedBy(rate));
      }
    }
  }
  return (base: string, quote: string): Quote | null =>
    latest.get(JSON.stringify([base, quote])) ?? null;
}

/**
 * Add the market value, the quote, the conversion rate and the quote in the
 * conversion currency to each detail row from the ledger's price directives
 * (w1/229). A lot with no quote is valued at cost, as the composer reports; a
 * conversion with no quote leaves the lot in its held currency, as the
 * composer reports too. The fourth column is the commodity's own quote in the
 * conversion currency, which the composer values the lot at when there is
 * one (w1/290). The last two are the dates of the two quotes, so a group
 * merged from lots costed in different currencies keeps its latest (w1/292).
 */
export function valueHoldingRows(params: {
  columns: string[];
  rows: BqlCell[][];
  prices: BqlCell[][];
  conversionTarget: string | null;
  asOf: string;
}): { columns: string[]; rows: BqlCell[][] } {
  const { columns, rows, prices, conversionTarget, asOf } = params;
  const quote = priceLookup(prices, asOf);
  const at = (name: string): number => columns.indexOf(name);
  return {
    columns: [
      ...columns,
      "market_value",
      "price",
      "conv_rate",
      "direct_price",
      "price_date",
      "direct_date",
    ],
    rows: rows.map((row) => {
      const commodity = row[at("currency")];
      const held = row[at("cost_currency")];
      const unitsText =
        typeof commodity === "string"
          ? moneyIn(row[at("units")], commodity)
          : null;
      const basisText =
        typeof held === "string" ? moneyIn(row[at("book_value")], held) : null;
      if (
        typeof commodity !== "string" ||
        typeof held !== "string" ||
        unitsText === null ||
        basisText === null
      ) {
        return [...row, "", "", "", "", "", ""];
      }
      const price = quote(commodity, held);
      const market =
        price === null
          ? new BigNumber(basisText)
          : new BigNumber(unitsText).times(price.rate);
      const converts = conversionTarget !== null && conversionTarget !== held;
      const rate = converts ? quote(held, conversionTarget) : null;
      const direct = converts ? quote(commodity, conversionTarget) : null;
      return [
        ...row,
        { [held]: plain(market) },
        price === null ? "" : plain(price.rate),
        rate === null ? "" : plain(rate.rate),
        direct === null ? "" : plain(direct.rate),
        price?.date ?? "",
        direct?.date ?? "",
      ];
    }),
  };
}

/** Cells naming the currencies in a column, e.g. the posting price query's. */
function currenciesIn(rows: BqlCell[][]): string[] {
  return rows.flatMap(([cell]) =>
    typeof cell === "string" && cell !== "" ? [cell] : [],
  );
}

/**
 * The currencies this ledger uses as money: the operating currencies and every
 * currency a lot is costed in, since the currency paid for holdings settles
 * them. Being quoted in does not make a commodity money — a USD ledger pricing
 * `ETH` in `BTC`, by a directive or a posting price, still holds BTC as an
 * investment (w1/255). Only a ledger that declares no operating currency also
 * counts every posting-price and price-directive quote currency (w1/253).
 * Across the whole ledger, so the account filter does not change what is
 * cash. The CLI's rule.
 */
function moneyCurrencies(
  rows: BqlCell[][],
  heldAt: number,
  prices: BqlCell[][],
  priceCurrencies: BqlCell[][],
  operating: readonly string[],
): Set<string> {
  const money = new Set<string>(operating);
  for (const row of rows) {
    const held = row[heldAt];
    if (typeof held === "string" && held !== "") money.add(held);
  }
  if (operating.length > 0) return money;
  for (const quote of currenciesIn(priceCurrencies)) money.add(quote);
  for (const row of prices) {
    for (const [quote] of quotesOf(row)) money.add(quote);
  }
  return money;
}

/** Currencies `commodity` is quoted in by a directive, either direction. */
function quoteCurrencies(prices: BqlCell[][], commodity: string): string[] {
  const found = new Set<string>();
  for (const row of prices) {
    const base = row[1];
    for (const [quote] of quotesOf(row)) {
      if (base === commodity) found.add(quote);
      if (quote === commodity && typeof base === "string") found.add(base);
    }
  }
  return [...found].sort();
}

/** One costed lot valued at the as-of date. */
type ValuedLot = {
  basis: BigNumber;
  market: BigNumber;
  /** The quote behind the market value, in its currency; null at cost. */
  price: string | null;
  /** The date of the directive behind `price`; null at cost. */
  priceDate: string | null;
  /** The currency the market value and its quote are in. */
  currency: string;
  /** The currency the basis is in: still the cost currency without its rate. */
  basisCurrency: string;
};

/** One holding: its lots of one commodity valued into the same currencies. */
type HeldLot = ValuedLot & {
  units: BigNumber;
  accounts: Set<string>;
  /** False once a position bought with a price but no cost joins (w1/253). */
  basisKnown: boolean;
  /** The cost currency before any conversion. */
  held: string;
  /** The cost currency of the lot whose quote `price` is. */
  quotedHeld: string;
};

/**
 * Value one costed lot, the CLI's `_value_holding`. A quote in the requested
 * currency values the lot directly, as Beancount's own conversion does
 * (w5/1033, w1/290): routed through the cost currency, a lot with no quote
 * there was valued at cost, and an older one there misvalued it. The basis
 * still converts through the cost currency; without that rate it stays in it
 * beside the market value (w5/1117), and the composer names the missing rate.
 * Without a direct quote the lot values through its cost currency: at its
 * quote there, else at cost, converted when the leg has a rate.
 */
function valueLot(lot: {
  units: BigNumber;
  basis: BigNumber;
  /** In the cost currency: at its quote there, else at cost. */
  market: BigNumber;
  /** The commodity's quote in its cost currency, and its date. */
  price: string | null;
  priceDate: string | null;
  /** The cost currency's quote in the target. */
  rate: string | null;
  /** The commodity's quote in the target, and its date. */
  direct: string | null;
  directDate: string | null;
  commodity: string;
  held: string;
  target: string | null;
  miss: (from: string, to: string) => void;
}): ValuedLot {
  const { units, basis, market, price, priceDate, commodity, held } = lot;
  const { target, miss } = lot;
  const unconverted = { basis, market, price, priceDate, currency: held };
  if (target === null || target === held) {
    if (price === null) miss(commodity, held);
    return { ...unconverted, basisCurrency: held };
  }
  const rate = lot.rate === null ? null : new BigNumber(lot.rate);
  if (lot.direct !== null) {
    return {
      basis: rate === null ? basis : basis.times(rate),
      market: units.times(lot.direct),
      price: lot.direct,
      priceDate: lot.directDate,
      currency: target,
      basisCurrency: rate === null ? held : target,
    };
  }
  if (price === null) miss(commodity, held);
  if (rate === null) {
    miss(held, target);
    return { ...unconverted, basisCurrency: held };
  }
  return {
    basis: basis.times(rate),
    market: market.times(rate),
    price: price === null ? null : plain(new BigNumber(price).times(rate)),
    priceDate,
    currency: target,
    basisCurrency: target,
  };
}

/** A cell's ISO date, or null. */
function dateIn(cell: BqlCell | undefined): string | null {
  return typeof cell === "string" && cell !== "" ? cell : null;
}

/**
 * Whether a lot's quote replaces the one a merged group shows, the CLI's
 * `_merged_holding`: the latest quote wins, a quote beats none, and of two
 * on one day the lot costed in the alphabetically first currency keeps its
 * own, as the CLI lists its parts (w1/292).
 */
function quotesLater(
  lot: { priceDate: string | null; held: string },
  group: { priceDate: string | null; quotedHeld: string },
): boolean {
  const mine = lot.priceDate ?? "";
  const shown = group.priceDate ?? "";
  return mine > shown || (mine === shown && lot.held < group.quotedHeld);
}

export function composeHoldings(params: {
  columns: string[];
  rows: BqlCell[][];
  groupBy: HoldingsGrouping;
  account: string | undefined;
  roots: readonly string[];
  /**
   * The ledger's Assets and Liabilities root names. An uncosted balance under
   * any other root (`Expenses:Travel 100 EUR @ 1.1 USD`) is a flow, not a
   * holding (w1/256, the CLI's rule).
   */
  positionRoots: readonly string[];
  conversionTarget: string | null;
  asOf: string;
  /** The price directives, as for {@link valueHoldingRows}. */
  prices?: BqlCell[][];
  /** {@link HOLDINGS_PRICE_CURRENCIES_QUERY}'s rows. */
  priceCurrencies?: BqlCell[][];
  operatingCurrencies?: readonly string[];
}): HoldingsResult {
  const { columns, rows, groupBy, account, roots, conversionTarget, asOf } =
    params;
  const prices = params.prices ?? [];
  const operating = params.operatingCurrencies ?? [];
  const at = (name: HoldingsColumn): number => columns.indexOf(name);
  const lookup = priceLookup(prices, asOf);
  const quote = (base: string, to: string): BigNumber | null =>
    lookup(base, to)?.rate ?? null;
  const money = moneyCurrencies(
    rows,
    at("cost_currency"),
    prices,
    params.priceCurrencies ?? [],
    operating,
  );
  // (scope..., commodity, market currency, basis currency) -> one holding,
  // the CLI's rows: under a conversion, lots costed in USD and EUR that both
  // value into USD are one holding (w1/288), but a lot whose basis had no
  // rate stays apart from one whose basis converted.
  const lots = new Map<string, HeldLot>();
  // (scope..., commodity) -> [units, accounts]: uncosted, non-cash positions
  // (`3 AAPL @ 200 USD`), holdings with an unknown basis (w1/253).
  const uncosted = new Map<string, [BigNumber, Set<string>]>();
  const keyOf = (
    scope: string[],
    commodity: string,
    currency: string,
    basisCurrency: string,
  ): string => JSON.stringify([...scope, commodity, currency, basisCurrency]);
  /** A key's (scope..., commodity) prefix, as {@link uncosted} keys it. */
  const prefixOf = (key: string): string =>
    JSON.stringify((JSON.parse(key) as string[]).slice(0, -2));
  // Each missing leg remembers how its holdings are shown without it: a
  // costed lot at cost, an uncosted position with no quote in its own units
  // (w1/266). One leg can cover both kinds under per-account grouping.
  const missing = new Map<string, { from: string; to: string }>();
  const atCost = new Set<string>();
  const inUnits = new Set<string>();
  const miss = (from: string, to: string, uncostedLeg = false): void => {
    const id = `${from}→${to}`;
    missing.set(id, { from, to });
    (uncostedLeg ? inUnits : atCost).add(id);
  };
  const shownAs = (from: string, to: string): string => {
    const id = `${from}→${to}`;
    if (!inUnits.has(id)) return "valued at cost";
    if (!atCost.has(id)) return "shown in units";
    return "costed lots valued at cost, the rest shown in units";
  };

  for (const row of rows) {
    const name = row[at("account")];
    const commodity = row[at("currency")];
    const held = row[at("cost_currency")];
    if (
      typeof name !== "string" ||
      name === "" ||
      typeof commodity !== "string" ||
      commodity === ""
    ) {
      continue;
    }
    if (account !== undefined && !matchesAccountPattern(account, name, roots)) {
      continue;
    }
    if (typeof held !== "string" || held === "") {
      // Cash is told apart by its commodity, not by a missing cost — the
      // CLI's rule (w1/253) — and only a balance-sheet account holds a
      // position (w1/256).
      if (money.has(commodity)) continue;
      if (!params.positionRoots.includes(name.split(":", 1)[0]!)) continue;
      const amount = moneyIn(row[at("units")], commodity);
      if (amount === null || new BigNumber(amount).isZero()) continue;
      const pendingKey = JSON.stringify([
        ...(groupBy === "account" ? [name] : []),
        commodity,
      ]);
      const pending = uncosted.get(pendingKey);
      if (pending === undefined) {
        uncosted.set(pendingKey, [new BigNumber(amount), new Set([name])]);
      } else {
        pending[0] = pending[0].plus(amount);
        pending[1].add(name);
      }
      continue;
    }
    const units = moneyIn(row[at("units")], commodity);
    const basis = moneyIn(row[at("book_value")], held);
    const market = moneyIn(row[at("market_value")], held);
    if (units === null || basis === null || market === null) continue;
    const unitsBN = new BigNumber(units);
    // A lot with no units left is sold. Its group is left out only when
    // every lot is: a long and a short lot netting to zero are both held.
    if (unitsBN.isZero()) continue;
    const valued = valueLot({
      units: unitsBN,
      basis: new BigNumber(basis),
      market: new BigNumber(market),
      price: quoteIn(row[at("price")]),
      priceDate: dateIn(row[at("price_date")]),
      rate: quoteIn(row[at("conv_rate")]),
      direct: quoteIn(row[at("direct_price")]),
      directDate: dateIn(row[at("direct_date")]),
      commodity,
      held,
      target: conversionTarget,
      miss,
    });
    const key = keyOf(
      groupBy === "account" ? [name] : [],
      commodity,
      valued.currency,
      valued.basisCurrency,
    );
    const found = lots.get(key);
    if (found === undefined) {
      lots.set(key, {
        ...valued,
        units: unitsBN,
        accounts: new Set([name]),
        basisKnown: true,
        held,
        quotedHeld: held,
      });
    } else {
      found.units = found.units.plus(unitsBN);
      found.basis = found.basis.plus(valued.basis);
      found.accounts.add(name);
      found.market = found.market.plus(valued.market);
      // Lots costed in USD and EUR that both value into USD share this
      // group (w1/288): it shows one of their quotes rather than inventing
      // a blend, the latest, as the CLI does (w1/292).
      if (quotesLater({ priceDate: valued.priceDate, held }, found)) {
        found.price = valued.price;
        found.priceDate = valued.priceDate;
        found.quotedHeld = held;
      }
    }
  }

  for (const [pendingKey, [unitsBN, names]] of uncosted) {
    const prefix = JSON.parse(pendingKey) as string[];
    const commodity = prefix[prefix.length - 1]!;
    const costed = [...lots.keys()].filter(
      (key) => prefixOf(key) === pendingKey,
    );
    if (costed.length === 1) {
      // Joins the one costed group of its commodity, valued at its quote; an
      // unquoted group counts only its costed part, already named missing.
      const found = lots.get(costed[0]!)!;
      const { held, currency } = found;
      // A group valued into the requested currency by the commodity's own
      // quote there (w1/290) values these units at it too; otherwise they
      // go through the cost currency, as the group did.
      const direct = currency === held ? null : quote(commodity, currency);
      const price = quote(commodity, held);
      if (direct !== null) {
        found.market = found.market.plus(unitsBN.times(direct));
      } else if (price !== null) {
        let market = unitsBN.times(price);
        if (currency !== held) {
          const rate = quote(held, currency);
          market = rate === null ? market : market.times(rate);
        }
        found.market = found.market.plus(market);
      }
      found.units = found.units.plus(unitsBN);
      for (const n of names) found.accounts.add(n);
      found.basisKnown = false;
      continue;
    }
    // No cost currency to value into: the first operating currency (or other
    // currency the commodity is quoted in) with a quote, as Fava's `at_value`.
    const candidates = [
      ...new Set([
        ...(conversionTarget === null ? [] : [conversionTarget]),
        ...operating,
        ...quoteCurrencies(prices, commodity),
      ]),
    ].filter((currency) => currency !== commodity);
    const held = candidates.find(
      (currency) => quote(commodity, currency) !== null,
    );
    let currency = commodity;
    let market = unitsBN;
    let price: string | null = null;
    if (held === undefined) {
      if (candidates.length > 0) miss(commodity, candidates[0]!, true);
    } else {
      const quoted = quote(commodity, held)!;
      currency = held;
      market = unitsBN.times(quoted);
      price = plain(quoted);
      if (conversionTarget !== null && conversionTarget !== held) {
        const rate = quote(held, conversionTarget);
        if (rate === null) {
          miss(held, conversionTarget);
        } else {
          currency = conversionTarget;
          market = market.times(rate);
          price = plain(quoted.times(rate));
        }
      }
    }
    // Keyed apart from every costed group, as the CLI keys it, so no lot
    // merges into it; the group's currency rides in the value.
    lots.set(JSON.stringify([...prefix, "", ""]), {
      units: unitsBN,
      basis: new BigNumber(0),
      accounts: names,
      market,
      price,
      priceDate: null,
      basisKnown: false,
      held: currency,
      quotedHeld: currency,
      currency,
      basisCurrency: currency,
    });
  }

  const groups: HoldingsGroup[] = [];
  const totals = {
    cost_basis: new Map<string, BigNumber>(),
    market_value: new Map<string, BigNumber>(),
  };
  const total = (
    column: keyof typeof totals,
    currency: string,
    value: BigNumber,
  ): void => {
    totals[column].set(
      currency,
      (totals[column].get(currency) ?? new BigNumber(0)).plus(value),
    );
  };
  const ordered = [...lots.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  for (const [key, lot] of ordered) {
    const { units: unitsBN, basis: basisBN, market: marketBN, price } = lot;
    const { accounts, basisKnown, currency, basisCurrency } = lot;
    // Valued by a direct quote while its basis had no rate into the target
    // (w5/1117): that rate is missing only while there is a basis to convert,
    // so priced units that joined the group leave it unasked, as in the CLI.
    if (basisKnown && basisCurrency !== currency) miss(basisCurrency, currency);
    const parts = JSON.parse(key) as string[];
    const commodity = parts[parts.length - 3]!;
    // Lots still held whose units net to zero (+2 long, -2 short) are a
    // holding with a basis but no average cost (w5/947, w1/292).
    const group: HoldingsGroup = {
      ...(groupBy === "account"
        ? { account: parts[0]! }
        : { accounts: [...accounts].sort() }),
      commodity,
      units: { number: plain(unitsBN), currency: commodity },
      average_cost:
        basisKnown && !unitsBN.isZero()
          ? {
              number: plain(basisBN.dividedBy(unitsBN)),
              currency: basisCurrency,
            }
          : null,
      cost_basis: basisKnown
        ? { number: plain(basisBN), currency: basisCurrency }
        : null,
      market_value: { number: plain(marketBN), currency },
      price: price === null ? null : { number: price, currency },
    };
    groups.push(group);
    if (basisKnown) total("cost_basis", basisCurrency, basisBN);
    total("market_value", currency, marketBN);
  }

  const legs = [...missing.values()].sort((a, b) =>
    a.from < b.from || (a.from === b.from && a.to < b.to) ? -1 : 1,
  );
  return {
    group_by: groupBy,
    groups,
    totals: {
      cost_basis: Object.fromEntries(
        [...totals.cost_basis.entries()].map(([code, value]) => [
          code,
          plain(value),
        ]),
      ),
      market_value: Object.fromEntries(
        [...totals.market_value.entries()].map(([code, value]) => [
          code,
          plain(value),
        ]),
      ),
    },
    cost_basis_complete: groups.every((group) => group.cost_basis !== null),
    valuation: legs.length > 0 ? "partial" : "complete",
    missing_prices: legs,
    missing_price_summary: legs.map(
      ({ from, to }) =>
        `${from} has no ${to} quote at ${asOf}; ${shownAs(from, to)}`,
    ),
    as_of: asOf,
  };
}
