/**
 * What a balance figure says it is.
 *
 * Balances value holdings `at_value` (see `VALUATION_CONVERSION`), flows and
 * history `at_cost`. Either converts a commodity held at cost into the
 * operating currency, and leaves one with no cost — vacation hours,
 * placeholder IRA units — under its own key, where reading only the operating
 * currency turned `-8 VACHR` into `$0.00`. A second `units` read of the same
 * balance says what the ledger actually holds. From the two maps this decides
 * what a figure leads with:
 *
 * - a balance of one commodity (`597.748 RGAGX`, `-13 VACHR`) reads in its
 *   units, and carries its value when it has one, with that value's basis;
 * - anything else keeps the operating-currency total, and names the holdings
 *   that total cannot include.
 *
 * What a total then says about its basis lives in `valuation.ts`.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { operatingKey, resolveCurrencyBalance } from "./balance-util";
import { amountScale, formatUnits } from "./number-utils";
import type { Valuation } from "./valuation";

/** A beancount balance map as the API returns it: currency → decimal. */
export type BalanceMap = Record<string, number | string> | null | undefined;

/** One commodity amount, with the scale the ledger recorded it at. */
export type Holding = { currency: string; number: number; scale: number };

/**
 * The basis a commodity's value was read at: a market price, or its cost for
 * lack of one.
 */
export type ValueBasis = "market" | "cost";

export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

export type BalanceDisplay =
  | {
      kind: "money";
      /** Operating-currency total, as `resolveCurrencyBalance` reads it. */
      value: number;
      /** Holdings that total cannot express in the operating currency. */
      notInTotal: Holding[];
      /**
       * What the total discloses about its basis, when the caller shows it:
       * a Home page, an Accounts root, the account detail header.
       */
      valuation?: Valuation;
    }
  | {
      kind: "units";
      /** The one commodity the balance holds. */
      units: Holding;
      /**
       * Its value in the operating currency and the basis it was read at;
       * null when it has none. `basis` is null while the ledger's prices are
       * unknown.
       */
      value: { amount: number; basis: ValueBasis | null } | null;
    };

/**
 * One currency's entry in a balance map with its recorded scale, read strictly:
 * a missing or unparseable entry is zero, never the USD fallback.
 */
export function amountIn(
  map: BalanceMap,
  currency: string,
): { number: number; scale: number } {
  const raw = map?.[currency];
  const number = Number(raw);
  return raw == null || !Number.isFinite(number)
    ? { number: 0, scale: 0 }
    : { number, scale: amountScale(String(raw)) };
}

/** Non-zero entries of a balance map, in the order the API returned them. */
export function holdingsOf(map: BalanceMap): Holding[] {
  return Object.keys(map ?? {}).flatMap((currency) => {
    const amount = amountIn(map, currency);
    return amount.number === 0 ? [] : [{ currency, ...amount }];
  });
}

/** Holdings a total in `currency` leaves out of the figure it shows. */
export function notInTotalOf(map: BalanceMap, currency: string): Holding[] {
  const key = operatingKey(map, currency);
  return holdingsOf(map).filter((holding) => holding.currency !== key);
}

/**
 * How one balance reads, from its valued map and — when it has landed — its
 * `units` map. Without the units read, a commodity held at cost stays a money
 * figure, and only a balance of one unconverted commodity reads in units.
 * `basisOf` says which basis the valued map read a commodity at.
 */
export function selectBalanceDisplay(
  valued: BalanceMap,
  units: BalanceMap,
  currency: string,
  basisOf: (commodity: string) => ValueBasis | null = () => null,
): BalanceDisplay {
  const value = resolveCurrencyBalance(valued, currency);
  const notInTotal = notInTotalOf(valued, currency);
  const unitsHeld = holdingsOf(units);
  const [map, held]: [BalanceMap, Holding[]] =
    unitsHeld.length > 0 ? [units, unitsHeld] : [valued, holdingsOf(valued)];

  if (held.length === 1 && held[0].currency !== operatingKey(map, currency)) {
    return {
      kind: "units",
      units: held[0],
      value:
        notInTotal.length === 0 && value !== 0
          ? { amount: value, basis: basisOf(held[0].currency) }
          : null,
    };
  }
  return { kind: "money", value, notInTotal };
}

export const formatHolding = (holding: Holding, includePlus = false): string =>
  formatUnits(holding.number, holding.currency, holding.scale, includePlus);

/** The note naming holdings a total leaves out, or nothing when it has none. */
export function notInTotalNotes(
  holdings: readonly Holding[],
  t: Translate,
): string[] {
  return holdings.length === 0
    ? []
    : [
        t("notInTotal", {
          amounts: holdings.map((holding) => formatHolding(holding)).join(", "),
        }),
      ];
}
