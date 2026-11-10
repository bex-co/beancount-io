import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import {
  divideWithPythonDecimalContext,
  writtenScale,
} from "./decimal-context";

const Rate = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

interface PricePoint {
  date: string;
  rate: BigNumber;
  /** Decimal places the price was written with (an inverse: its own places). */
  scale: number;
}

/** A rate with the decimal places Python's `Decimal` would keep for it. */
interface ScaledRate {
  value: BigNumber;
  scale: number;
}

const SEP = " ";
const key = (base: string, quote: string): string => `${base}${SEP}${quote}`;

/**
 * A read-only price lookup built from `Price` directives — a focused port of
 * fava-slim's `FavaPriceMap` for the value-conversion use case. Records both the
 * quoted rate and its inverse, keeps the last rate per day, and resolves the
 * latest (or as-of-date) rate for a currency pair. `getRate(base, quote)`
 * returns a stringifiable `BigNumber`, or `null` when no path exists.
 *
 * `getScaledRate` is the same lookup with the price's written decimal places.
 * `Decimal` multiplication sums the operands' places (`10 * Decimal("200.00")`
 * is `Decimal("2000.00")`) and a `BigNumber` rate has already dropped its
 * trailing zeros, so a valued amount's places cannot be recovered from the
 * product (w22/016).
 */
export interface PriceMap {
  getRate(base: string, quote: string, date?: string): BigNumber | null;
  getScaledRate(base: string, quote: string, date?: string): ScaledRate | null;
}

export function buildPriceMap(directives: DirectiveJson[]): PriceMap {
  const raw = new Map<string, PricePoint[]>();

  const add = (
    base: string,
    quote: string,
    date: string,
    rate: BigNumber,
    scale: number,
  ): void => {
    const k = key(base, quote);
    const list = raw.get(k);
    if (list) list.push({ date, rate, scale });
    else raw.set(k, [{ date, rate, scale }]);
  };

  directives.forEach((directive) => {
    if (directive.type !== "price") return;
    const rate = new Rate(directive.amount.number);
    add(
      directive.currency,
      directive.amount.currency,
      directive.date,
      rate,
      writtenScale(directive.amount.number),
    );
    if (!rate.isZero()) {
      const inverse = divideWithPythonDecimalContext(1, rate);
      add(
        directive.amount.currency,
        directive.currency,
        directive.date,
        inverse,
        inverse.decimalPlaces() ?? 0,
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

  const lookup = (
    base: string,
    quote: string,
    date?: string,
  ): ScaledRate | null => {
      if (base === quote) return { value: new Rate(1), scale: 0 };
      const list = map.get(key(base, quote));
      if (!list || list.length === 0) return null;
      if (date === undefined) {
        const last = list[list.length - 1];
        return { value: last.rate, scale: last.scale };
      }
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
      if (foundIndex === -1) return null;
      const found = list[foundIndex];
      return { value: found.rate, scale: found.scale };
  };

  return {
    getRate: (base, quote, date) => lookup(base, quote, date)?.value ?? null,
    getScaledRate: lookup,
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
