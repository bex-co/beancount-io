import BigNumber from "bignumber.js";
import type { DirectiveJson, MetaValueJson } from "@rustledger/wasm";
import { collectLedgerAccounts } from "./account-list";
import { divideWithPythonDecimalContext } from "./decimal-context";

/**
 * Pure directive-walk reports over a parsed `DirectiveJson[]` — the Tier-2
 * building blocks for the fava_api endpoints that Fava derived by iterating
 * entries (attributes, per-type counts, events, documents). No WASM at call
 * time, so these are unit-tested directly against directive fixtures.
 */

/** Count directives by type — parity for `getLedgerEntriesCountPerType`. */
export function entriesCountPerType(
  directives: DirectiveJson[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  directives.forEach((directive) => {
    counts[directive.type] = (counts[directive.type] ?? 0) + 1;
  });
  return counts;
}

export interface LedgerAttributes {
  accounts: string[];
  payees: string[];
  narrations: string[];
  tags: string[];
  links: string[];
  years: string[];
  currencies: string[];
}

const RANK_DECAY_RATE = Math.log(2) / 365;
const PYTHON_ORDINAL_AT_UNIX_EPOCH = 719_163;

/** Faithful port of Fava's `ExponentialDecayRanker`. */
class ExponentialDecayRanker {
  private readonly scores = new Map<string, number>();

  constructor(private readonly list?: string[]) {}

  update(item: string, isoDate: string): void {
    const current = this.scores.get(item) ?? 0;
    const unixDays = Math.floor(
      Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000,
    );
    const datedScore =
      (unixDays + PYTHON_ORDINAL_AT_UNIX_EPOCH) * RANK_DECAY_RATE;
    const higher = Math.max(current, datedScore);
    const lower = Math.min(current, datedScore);
    this.scores.set(item, higher + Math.log1p(Math.exp(lower - higher)));
  }

  sort(): string[] {
    const values = this.list ?? [...this.scores.keys()];
    return [...values].sort(
      (left, right) =>
        (this.scores.get(right) ?? 0) - (this.scores.get(left) ?? 0),
    );
  }
}

function activeYears(
  directives: DirectiveJson[],
  fiscalYearEnd: string,
): string[] {
  const [month, day] = fiscalYearEnd
    .split("-", 2)
    .map((part) => Number.parseInt(part, 10));
  const calendarYear = month === 12 && day === 31;
  const years = new Set<number>();

  directives.forEach((directive) => {
    const [year, entryMonth, entryDay] = directive.date
      .split("-", 3)
      .map((part) => Number.parseInt(part, 10));
    const fiscalYear =
      !calendarYear &&
      (entryMonth > month || (entryMonth === month && entryDay > day))
        ? year + 1
        : year;
    years.add(fiscalYear);
  });

  return [...years]
    .sort((left, right) => right - left)
    .map((year) => (calendarYear ? String(year) : `FY${year}`));
}

/**
 * Extract the ledger's attribute sets (sorted, de-duplicated) — parity for
 * `getLedgerAttributes` and the singular list endpoints (`getLedgerPayees`,
 * `getLedgerAccounts`, `getLedgerTags`, `getLedgerLinks`, `getLedgerYears`,
 * `getLedgerCurrencies`, `getLedgerNarrations`).
 */
export function collectAttributes(
  directives: DirectiveJson[],
  fiscalYearEnd = "12-31",
): LedgerAttributes {
  const tags = new Set<string>();
  const links = new Set<string>();
  const accountRanker = new ExponentialDecayRanker(
    Object.keys(collectLedgerAccounts(directives)).sort(),
  );
  const currencyRanker = new ExponentialDecayRanker();
  const payeeRanker = new ExponentialDecayRanker();
  const narrationRanker = new ExponentialDecayRanker();

  directives.forEach((directive) => {
    switch (directive.type) {
      case "transaction": {
        if (directive.payee)
          payeeRanker.update(directive.payee, directive.date);
        if (directive.narration) {
          narrationRanker.update(directive.narration, directive.date);
        }
        directive.tags.forEach((tag) => tags.add(tag));
        directive.links.forEach((link) => links.add(link));
        directive.postings.forEach((posting) => {
          accountRanker.update(posting.account, directive.date);
          if (posting.units) {
            currencyRanker.update(posting.units.currency, directive.date);
          }
          if (posting.cost?.currency) {
            currencyRanker.update(posting.cost.currency, directive.date);
          }
        });
        break;
      }
      case "document": {
        directive.tags?.forEach((tag) => tags.add(tag));
        directive.links?.forEach((link) => links.add(link));
        break;
      }
      default:
        break;
    }
  });

  // Python's `sorted()` is case-sensitive/code-point ordered; `localeCompare`
  // is locale-dependent and would reorder values such as `Z` and `a`.
  const sortedStrings = (set: Set<string>): string[] => [...set].sort();

  return {
    accounts: accountRanker.sort(),
    payees: payeeRanker.sort(),
    narrations: narrationRanker.sort(),
    tags: sortedStrings(tags),
    links: sortedStrings(links),
    years: activeYears(directives, fiscalYearEnd),
    currencies: currencyRanker.sort(),
  };
}

/**
 * Accounts appearing in transactions with the given payee (sorted, unique) —
 * parity for `getLedgerPayeeAccounts`.
 */
export function accountsForPayee(
  directives: DirectiveJson[],
  payee: string,
): string[] {
  const ranker = new ExponentialDecayRanker(
    collectAttributes(directives).accounts,
  );
  directives.forEach((directive) => {
    if (directive.type === "transaction" && directive.payee === payee) {
      directive.postings.forEach((posting) =>
        ranker.update(posting.account, directive.date),
      );
    }
  });
  return ranker.sort();
}

export interface LedgerEvent {
  date: string;
  type: string;
  value: string;
}

/** Extract event directives — parity for `getLedgerEvents`. */
export function collectEvents(directives: DirectiveJson[]): LedgerEvent[] {
  return directives
    .filter(
      (directive): directive is Extract<DirectiveJson, { type: "event" }> =>
        directive.type === "event",
    )
    .map((directive) => ({
      date: directive.date,
      type: directive.event_type,
      value: directive.value,
    }));
}

interface CommodityPricePoint {
  date: string;
  value: string;
}

export interface CommodityPair {
  base: string;
  quote: string;
  prices: CommodityPricePoint[];
}

const PAIR_SEP = "\u0000";
const pairKey = (base: string, quote: string): string =>
  `${base}${PAIR_SEP}${quote}`;

/**
 * Commodity pairs with price history — parity for `getLedgerCommodities`.
 * Faithful reimplementation of fava-slim's `FavaPriceMap.commodity_pairs` +
 * per-pair price lists: builds forward + inverse rate lists from `Price`
 * directives, keeps the last price per day, picks the dominant direction per
 * pair, and (for pairs whose base & quote are both operating currencies) also
 * emits the reverse pair. Forward rates are the exact source strings; inverse
 * rates use high-precision division (see `InverseRate`).
 */
export function commodityPairsWithPrices(
  directives: DirectiveJson[],
  operatingCurrencies: string[],
): CommodityPair[] {
  const rawMap = new Map<string, CommodityPricePoint[]>();
  const pairs = new Map<string, [string, string]>();
  const counts = new Map<string, number>();

  const add = (
    base: string,
    quote: string,
    point: CommodityPricePoint,
  ): void => {
    const key = pairKey(base, quote);
    const existing = rawMap.get(key);
    if (existing) {
      existing.push(point);
    } else {
      rawMap.set(key, [point]);
      pairs.set(key, [base, quote]);
    }
  };

  directives.forEach((directive) => {
    if (directive.type !== "price") return;
    const base = directive.currency;
    const quote = directive.amount.currency;
    const rate = directive.amount.number;
    add(base, quote, { date: directive.date, value: rate });
    counts.set(
      pairKey(base, quote),
      (counts.get(pairKey(base, quote)) ?? 0) + 1,
    );
    if (!new BigNumber(rate).isZero()) {
      add(quote, base, {
        date: directive.date,
        value: divideWithPythonDecimalContext(1, rate).toString(),
      });
    }
  });

  // Keep the last price per day (source is date-sorted; JS sort is stable so
  // same-day order is preserved and the last wins).
  const priceMap = new Map<string, CommodityPricePoint[]>();
  rawMap.forEach((points, key) => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const perDay: CommodityPricePoint[] = [];
    sorted.forEach((point) => {
      const last = perDay[perDay.length - 1];
      if (last && last.date === point.date) {
        perDay[perDay.length - 1] = point;
      } else {
        perDay.push(point);
      }
    });
    priceMap.set(key, perDay);
  });

  // Forward pairs: the direction seen at least as often as its inverse.
  const forward: Array<[string, string]> = [];
  pairs.forEach(([base, quote], key) => {
    const count = counts.get(key) ?? 0;
    if (count === 0) return; // inverse-only synthetic direction
    if ((counts.get(pairKey(quote, base)) ?? 0) < count) {
      forward.push([base, quote]);
    }
  });

  const extra: Array<[string, string]> = [];
  forward.forEach(([base, quote]) => {
    if (
      operatingCurrencies.includes(base) &&
      operatingCurrencies.includes(quote)
    ) {
      extra.push([quote, base]);
    }
  });

  const compareCodePoints = (left: string, right: string): number =>
    left < right ? -1 : left > right ? 1 : 0;
  const ordered = [...forward, ...extra].sort((a, b) =>
    a[0] === b[0]
      ? compareCodePoints(a[1], b[1])
      : compareCodePoints(a[0], b[0]),
  );

  const result: CommodityPair[] = [];
  ordered.forEach(([base, quote]) => {
    const prices = priceMap.get(pairKey(base, quote));
    if (prices && prices.length > 0) {
      result.push({ base, quote, prices });
    }
  });
  return result;
}

export interface LedgerDocument {
  date: string;
  account: string;
  path: string;
  tags: string[];
  links: string[];
  meta: Record<string, MetaValueJson>;
}

/** Extract document directives — parity for `getLedgerDocuments`. */
export function collectDocuments(
  directives: DirectiveJson[],
): LedgerDocument[] {
  return directives
    .filter(
      (directive): directive is Extract<DirectiveJson, { type: "document" }> =>
        directive.type === "document",
    )
    .map((directive) => ({
      date: directive.date,
      account: directive.account,
      path: directive.path,
      tags: directive.tags ?? [],
      links: directive.links ?? [],
      meta: directive.meta ?? {},
    }));
}
