/**
 * What a balance figure says it is.
 *
 * Every balance query values holdings `at_cost` (see `BALANCE_CONVERSION`). That
 * converts a commodity held at cost into the operating currency, and leaves one
 * with no cost — vacation hours, placeholder IRA units — under its own key,
 * where reading only the operating currency turned `-8 VACHR` into `$0.00`. A
 * second `units` read of the same balance says what the ledger actually holds.
 * From the two maps this decides what a figure leads with:
 *
 * - a balance of one commodity (`597.748 RGAGX`, `-13 VACHR`) reads in its
 *   units, and carries its cost when it has one;
 * - anything else keeps the operating-currency total at cost, and names the
 *   holdings that total cannot include.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { operatingKey, resolveCurrencyBalance } from "./balance-util";
import {
  amountScale,
  formatSignedMoneyWithCurrency,
  formatUnits,
} from "./number-utils";

/** A beancount balance map as the API returns it: currency → decimal. */
export type BalanceMap = Record<string, number | string> | null | undefined;

/** One commodity amount, with the scale the ledger recorded it at. */
export type Holding = { currency: string; number: number; scale: number };

export type BalanceDisplay =
  | {
      kind: "money";
      /** Operating-currency total at cost, as `resolveCurrencyBalance` reads it. */
      value: number;
      /** Holdings that total cannot express in the operating currency. */
      notInTotal: Holding[];
    }
  | {
      kind: "units";
      /** The one commodity the balance holds. */
      units: Holding;
      /** Its value at cost in the operating currency; null when it has none. */
      cost: number | null;
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
function holdingsOf(map: BalanceMap): Holding[] {
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
 * How one balance reads, from its `at_cost` map and — when it has landed — its
 * `units` map. Without the units read, a commodity held at cost stays a money
 * figure, and only a balance of one unconverted commodity reads in units.
 */
export function selectBalanceDisplay(
  atCost: BalanceMap,
  units: BalanceMap,
  currency: string,
): BalanceDisplay {
  const value = resolveCurrencyBalance(atCost, currency);
  const notInTotal = notInTotalOf(atCost, currency);
  const unitsHeld = holdingsOf(units);
  const [map, held]: [BalanceMap, Holding[]] =
    unitsHeld.length > 0 ? [units, unitsHeld] : [atCost, holdingsOf(atCost)];

  if (held.length === 1 && held[0].currency !== operatingKey(map, currency)) {
    return {
      kind: "units",
      units: held[0],
      cost: notInTotal.length === 0 && value !== 0 ? value : null,
    };
  }
  return { kind: "money", value, notInTotal };
}

export const formatHolding = (holding: Holding, includePlus = false): string =>
  formatUnits(holding.number, holding.currency, holding.scale, includePlus);

type Translate = (key: string, params?: Record<string, unknown>) => string;

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

/**
 * The notes that say what a balance figure is — the cost behind a units
 * figure, or the holdings a money total leaves out. A row shows them as lines
 * under the figure; a chart joins them into its caption. Empty for a plain
 * money balance.
 */
export function balanceNotes(
  display: BalanceDisplay,
  currency: string,
  t: Translate,
): string[] {
  if (display.kind === "money") {
    return notInTotalNotes(display.notInTotal, t);
  }
  return display.cost === null
    ? []
    : [
        t("atCost", {
          amount: formatSignedMoneyWithCurrency(display.cost, currency),
        }),
      ];
}
