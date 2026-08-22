import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import { divideWithPythonDecimalContext } from "./decimal-context";

const Rate = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

interface PricePoint {
  date: string;
  rate: BigNumber;
}

const SEP = " ";
const key = (base: string, quote: string): string => `${base}${SEP}${quote}`;

/**
 * A read-only price lookup built from `Price` directives — a focused port of
 * fava-slim's `FavaPriceMap` for the value-conversion use case. Records both the
 * quoted rate and its inverse, keeps the last rate per day, and resolves the
 * latest (or as-of-date) rate for a currency pair. `getRate(base, quote)`
 * returns a stringifiable `BigNumber`, or `null` when no path exists.
 */
export interface PriceMap {
  getRate(base: string, quote: string, date?: string): BigNumber | null;
}

export function buildPriceMap(directives: DirectiveJson[]): PriceMap {
  const raw = new Map<string, PricePoint[]>();

  const add = (
    base: string,
    quote: string,
    date: string,
    rate: BigNumber,
  ): void => {
    const k = key(base, quote);
    const list = raw.get(k);
    if (list) list.push({ date, rate });
    else raw.set(k, [{ date, rate }]);
  };

  directives.forEach((directive) => {
    if (directive.type !== "price") return;
    const rate = new Rate(directive.amount.number);
    add(directive.currency, directive.amount.currency, directive.date, rate);
    if (!rate.isZero()) {
      add(
        directive.amount.currency,
        directive.currency,
        directive.date,
        divideWithPythonDecimalContext(1, rate),
      );
    }
  });

  // Sort by date and keep the last rate per day.
  const map = new Map<string, PricePoint[]>();
  raw.forEach((points, k) => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const perDay: PricePoint[] = [];
    sorted.forEach((point) => {
      const last = perDay[perDay.length - 1];
      if (last && last.date === point.date) perDay[perDay.length - 1] = point;
      else perDay.push(point);
    });
    map.set(k, perDay);
  });

  return {
    getRate(base: string, quote: string, date?: string): BigNumber | null {
      if (base === quote) return new Rate(1);
      const list = map.get(key(base, quote));
      if (!list || list.length === 0) return null;
      if (date === undefined) return list[list.length - 1].rate;
      // Latest point with date <= the requested date. Price histories can have
      // one entry per day for years; bisect instead of walking from the start on
      // every valuation.
      let low = 0;
      let high = list.length - 1;
      let foundIndex = -1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (list[middle].date <= date) {
          foundIndex = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      return foundIndex === -1 ? null : list[foundIndex].rate;
    },
  };
}

/**
 * Convert a units inventory (`currency -> BigNumber`) into `targetCurrency`
 * using market rates from `priceMap`. Amounts already in the target pass
 * through; amounts with no conversion path stay in their original currency
 * (matching fava's "leave unconvertible positions as-is" behavior).
 */
export function convertInventory(
  balance: Map<string, BigNumber>,
  targetCurrency: string,
  priceMap: PriceMap,
  date?: string,
): Map<string, BigNumber> {
  const result = new Map<string, BigNumber>();
  const addInto = (currency: string, value: BigNumber): void => {
    const existing = result.get(currency);
    result.set(currency, existing ? existing.plus(value) : value);
  };

  balance.forEach((number, currency) => {
    if (currency === targetCurrency) {
      addInto(targetCurrency, number);
      return;
    }
    const rate = priceMap.getRate(currency, targetCurrency, date);
    if (rate) addInto(targetCurrency, number.times(rate));
    else addInto(currency, number);
  });

  return result;
}
