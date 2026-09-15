import { getCurrencySymbol } from "./currency-util";

const SHORT_NUMBER_SUFFIXES = [
  { value: 1, symbol: "" },
  { value: 1e3, symbol: "K" },
  { value: 1e6, symbol: "M" },
  { value: 1e9, symbol: "B" },
  { value: 1e12, symbol: "T" },
  { value: 1e15, symbol: "Q" },
];

export const shortNumber = (number: number | string): string => {
  // Convert string to number if needed
  const num = typeof number === "string" ? parseFloat(number) : number;

  // Handle invalid numbers
  if (isNaN(num)) {
    return number.toString();
  }

  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);

  // The largest suffix the magnitude reaches, promoted when one-decimal
  // rounding would show 1000 of it (999,999 is "1.0M", not "1000.0K"). The
  // largest suffix has nothing to promote to.
  const last = SHORT_NUMBER_SUFFIXES.length - 1;
  let tier = last;
  while (tier > 0 && absNum < SHORT_NUMBER_SUFFIXES[tier].value) tier--;
  if (
    tier < last &&
    Number((absNum / SHORT_NUMBER_SUFFIXES[tier].value).toFixed(1)) >= 1000
  ) {
    tier++;
  }

  const { value, symbol } = SHORT_NUMBER_SUFFIXES[tier];
  const shortNum = absNum / value;
  // Whole values drop the decimal at every magnitude: "0", "50", "1K".
  const digits = Number.isInteger(shortNum)
    ? shortNum.toString()
    : shortNum.toFixed(1);
  return sign + digits + symbol;
};

/** `Number.prototype.toFixed` rejects anything above this. */
const MAX_FRACTION_DIGITS = 20;

/**
 * Fraction digits recorded in an amount string, e.g. `"0.004"` → 3.
 *
 * The API returns amounts as decimal strings, which is the only place a
 * commodity's real scale survives: `parseFloat` keeps the value but loses the
 * intent, and formatting at a flat two digits then rounded 0.004 ETH to 0.00.
 */
export const amountScale = (number: string): number => {
  const dot = number.indexOf(".");
  if (dot < 0) return 0;
  return number.length - dot - 1;
};

/**
 * Group the integer part of a number with thousands separators and keep
 * `digits` decimals — two by default, for money (e.g. 1234.5 → "1,234.50"); a
 * commodity passes its recorded scale. Always non-negative — the sign is the
 * caller's concern. Hermes-safe (no `toLocaleString` reliance).
 */
export const groupThousands = (value: number, digits = 2): string => {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0;
  const fixed = safe.toFixed(
    Math.min(MAX_FRACTION_DIGITS, Math.max(0, digits)),
  );
  const [intPart, decimals] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
};

// Sign prefix + grouped absolute amount, shared by the money and units
// formatters. The sign is always a prefix; only what labels the amount differs.
const signedAmount = (
  value: number,
  includePlus: boolean,
  digits = 2,
): { sign: string; amount: string } => {
  const normalized = Number.isFinite(value) ? value : 0;
  return {
    sign: normalized < 0 ? "-" : includePlus ? "+" : "",
    amount: groupThousands(normalized, digits),
  };
};

/**
 * A commodity amount at its recorded scale, labelled by its code:
 * "597.748 RGAGX", "+5 VACHR". Unlike money, a commodity is never given a
 * symbol, and its scale is never rounded to cents.
 */
export const formatUnits = (
  value: number,
  currency: string,
  scale: number,
  includePlus = false,
): string => {
  const { sign, amount } = signedAmount(value, includePlus, scale);
  return `${sign}${amount} ${currency}`;
};

/**
 * A signed money string with a currency symbol, e.g. "-$1,234.50" or "$0.00".
 * Pass `includePlus` to prefix a "+" on non-negative amounts (e.g. "+$1,234.50")
 * for gain/loss deltas.
 */
export const formatSignedMoney = (
  value: number,
  symbol: string,
  includePlus = false,
): string => {
  const { sign, amount } = signedAmount(value, includePlus);
  return `${sign}${symbol}${amount}`;
};

// Wrap a sign + absolute amount in its currency: a known symbol prefixes (right
// after the sign, e.g. "-$1,234.50"); an unknown/symbol-less currency's code is
// appended after the amount (e.g. "1,234.50 MUSD"), so a custom commodity is
// never shown as a bare, unlabeled number.
const annotateCurrency = (
  sign: string,
  absAmount: string,
  currency: string,
): string => {
  const symbol = getCurrencySymbol(currency);
  return symbol
    ? `${sign}${symbol}${absAmount}`
    : `${sign}${absAmount} ${currency}`;
};

/**
 * An unsigned money string annotated with its currency (e.g. "$1,234.50" or
 * "1,234.50 MUSD"). Use for absolute figures where the sign is not shown — a
 * running balance, a category total, an account row. Resolves the symbol from
 * the currency code and falls back to appending the code.
 */
export const formatMoneyWithCurrency = (
  value: number,
  currency: string,
): string => annotateCurrency("", groupThousands(value), currency);

/**
 * A signed money string annotated with its currency, resolving the symbol from
 * the currency code. When the currency has a known symbol it is prefixed
 * (e.g. "-$1,234.50"); otherwise the currency code is appended after the amount
 * (e.g. "551,620.00 MUSD") so a custom or unrecognized commodity is never shown
 * as a bare, unlabeled number. Prefer this over `formatSignedMoney` wherever the
 * currency code is available.
 */
export const formatSignedMoneyWithCurrency = (
  value: number,
  currency: string,
  includePlus = false,
): string => {
  const { sign, amount } = signedAmount(value, includePlus);
  return annotateCurrency(sign, amount, currency);
};

/**
 * `shortNumber` with its currency, for chart axes and chart summaries. Same
 * rules as the long form: the sign always leads, and a currency with no symbol
 * is labelled by its code, so a tick reads "-$50" or "400 MUSD", never "$-50"
 * or a bare "400".
 */
export const formatShortMoneyWithCurrency = (
  value: number,
  currency: string,
): string =>
  annotateCurrency(
    value < 0 ? "-" : "",
    shortNumber(Math.abs(value)),
    currency,
  );
