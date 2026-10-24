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
import { isolateLtr } from "./bidi";
import { resolveCurrencyBalance } from "./balance-util";
import { amountScale, formatExactUnits, formatUnits } from "./number-utils";
import type { Valuation } from "./valuation";

/** A beancount balance map as the API returns it: currency → decimal. */
export type BalanceMap = Record<string, number | string> | null | undefined;

/** One commodity amount, with the scale the ledger recorded it at. */
export type Holding = {
  currency: string;
  number: number;
  scale: number;
  /**
   * The exact decimal string, kept only when the amount needs more significant
   * digits than a double holds (18 decimals of ETH), so it is shown as the
   * ledger wrote it (w21/594).
   */
  exact?: string;
};

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
      /**
       * The part of this commodity the value leaves out: lots with no cost,
       * which the ledger keeps in units beside the lots it converted. Empty
       * when nothing was converted, where the units already say it all.
       */
      notInTotal: Holding[];
      /**
       * What the value discloses about its prices, when the caller shows it: a
       * root holding one commodity warns of a stale price as a money total
       * does (w21/279).
       */
      valuation?: Valuation;
    };

/**
 * Whether a balance is lots held at cost: units that carry a value in the
 * operating currency. A split of such lots is no 900% gain, so its chart reads
 * neutral (w21/713). Units with no value, a foreign-currency card or bank
 * account, are money in another currency: their change has a percent and a
 * direction like any other (w21/958).
 */
export const isUnitsHeldAtCost = (display: BalanceDisplay): boolean =>
  display.kind === "units" && display.value !== null;

/**
 * One currency's entry in a balance map with its recorded scale, read strictly:
 * a missing or unparseable entry is zero.
 */
export function amountIn(
  map: BalanceMap,
  currency: string,
): { number: number; scale: number; exact?: string } {
  const raw = map?.[currency];
  const number = Number(raw);
  if (raw == null || !Number.isFinite(number)) return { number: 0, scale: 0 };
  const text = String(raw).trim();
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").length;
  return {
    number,
    scale: amountScale(text),
    ...(digits > 15 && /^[+-]?\d+(\.\d+)?$/.test(text) ? { exact: text } : {}),
  };
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
  return holdingsOf(map).filter((holding) => holding.currency !== currency);
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
  const held = unitsHeld.length > 0 ? unitsHeld : holdingsOf(valued);

  if (held.length === 1 && held[0].currency !== currency) {
    // Some of the commodity converted (its lots with a cost) and some did not
    // (cost-less ones, `@ price` rewards, lots bought in a second currency that
    // has no price): the value stands, and names the remainder, rather than
    // being dropped for it (w21/278, w21/555). A balance of one commodity can
    // leave only that commodity or its lots' cost currencies in the map.
    const valued = value !== 0;
    return {
      kind: "units",
      units: held[0],
      value: valued
        ? { amount: value, basis: basisOf(held[0].currency) }
        : null,
      notInTotal: valued ? notInTotal : [],
    };
  }
  return { kind: "money", value, notInTotal };
}

export const formatHolding = (holding: Holding, includePlus = false): string =>
  (holding.exact
    ? formatExactUnits(holding.exact, holding.currency, includePlus)
    : null) ??
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
          // Each holding on its own, so the list keeps its order in a
          // right-to-left sentence and no sign strays (w21/249).
          amounts: holdings
            .map((holding) => isolateLtr(formatHolding(holding)))
            .join(", "),
        }),
      ];
}
