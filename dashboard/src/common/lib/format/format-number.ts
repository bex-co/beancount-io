/**
 * Format a number respecting the beancount render_commas option.
 *
 * @param value       - The value to format. A decimal string is formatted
 *                      exactly, digit for digit, where a double would round
 *                      a large ledger amount (9007199254740993) first.
 * @param renderCommas - When true, adds thousands separators (e.g. 1,234,567.89).
 *                       When false, omits them (e.g. 1234567.89).
 * @param locale      - Explicit formatting locale. Required for separators:
 *                      without it `toLocaleString` uses the runtime default, so
 *                      the server renders "80,149.807" and a French browser
 *                      hydrates "80 149,807", which React resolves by throwing
 *                      away and regenerating the server-rendered report tree.
 * @param fractionDigits - Digits a non-ISO commodity's source decimal carried
 *                      (`fractionDigitsOf`); they only extend the fallback's
 *                      three grouped / two ungrouped digits (w4/m45).
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | string,
  renderCommas: boolean,
  locale: string,
  currency?: string,
  fractionDigits = 0,
): string => {
  // An ISO 4217 currency is written at its minor-unit precision in both
  // render_commas modes — `4,559.80` and `109,529.34 USD`, never `4,559.8` or
  // `109,529.339` — so the option controls grouping only (w0/010).
  const digits = currency ? currencyMinorDigits(currency) : undefined;
  if (digits !== undefined) {
    // A residue that rounds to zero is zero, not "-0.00".
    const shown = Math.abs(Number(value)) < 0.5 * 10 ** -digits ? 0 : value;
    return numberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: renderCommas,
    }).format(shown);
  }
  return formatQuantity(
    value,
    Math.max(fractionDigits, renderCommas ? 3 : 2),
    renderCommas,
    locale,
  );
};

/** The most fraction digits Intl formats (ECMA-402 2023); a double gets 20. */
const MAX_STRING_FRACTION_DIGITS = 100;

let isoCurrencies: Set<string> | null = null;
const minorDigitsCache = new Map<string, number | undefined>();
const numberFormats = new Map<string, Intl.NumberFormat>();

/**
 * A shared `Intl.NumberFormat`: `toLocaleString` with options builds a new
 * formatter per call, which a long daily Budget table pays thousands of times.
 */
/**
 * `format` takes a decimal string exactly (ECMA-402 2023); the ES2022 typings
 * admit only numbers. An older engine converts the string to a number, which
 * is how every value was formatted before.
 */
type ExactNumberFormat = { format(value: number | string): string };

function numberFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
): ExactNumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

/**
 * The fraction digits an ISO 4217 currency is written with (USD 2, JPY 0,
 * KWD 3), or `undefined` for a commodity that is not one — tickers (`VHT`,
 * `GLD`), crypto (`BTC`) and ledger-defined units (`MUSD`, `VACHR`) keep the
 * source-driven formatting, so their recorded precision is never cut.
 */
export function currencyMinorDigits(currency: string): number | undefined {
  if (minorDigitsCache.has(currency)) return minorDigitsCache.get(currency);
  let digits: number | undefined;
  try {
    isoCurrencies ??= new Set(Intl.supportedValuesOf("currency"));
    if (isoCurrencies.has(currency)) {
      digits = new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits;
    }
  } catch {
    digits = undefined;
  }
  minorDigitsCache.set(currency, digits);
  return digits;
}

/**
 * How many fraction digits a source decimal carries — `"4.00995"` → 5.
 *
 * Read from the string the ledger sent, never from the parsed double: asking a
 * double for "all" its digits prints binary artifacts (0.1 + 0.2 becomes
 * 0.30000000000000004), while the source string says exactly how much
 * precision is real.
 */
export const fractionDigitsOf = (
  source: string | number | null | undefined,
): number => {
  if (source === null || source === undefined) return 0;
  const text = typeof source === "number" ? String(source) : source.trim();
  const separator = text.indexOf(".");
  if (separator === -1) return 0;
  const fraction = text.slice(separator + 1).replace(/[^0-9].*$/, "");
  return Math.min(fraction.length, MAX_STRING_FRACTION_DIGITS);
};

/**
 * Format a quantity, keeping the digits the ledger sent.
 *
 * The digit budget comes from the source decimal, so nothing is invented and
 * nothing is dropped: 4.00995 ETH never reads as 4.01 beside a journal showing
 * the full quantity. Grouping, locale separators and the no-trailing-zeros
 * shape follow `formatNumber`, which delegates its non-ISO commodities here.
 */
export const formatQuantity = (
  value: number | string,
  fractionDigits: number,
  renderCommas: boolean,
  locale: string,
): string => {
  // A double holds about 17 significant digits, so more places would print
  // binary noise; a decimal string is exact to its last place, which a tiny
  // quantity (0.000…001, 24 places) needs to stay nonzero (w4/1001).
  const limit = typeof value === "string" ? MAX_STRING_FRACTION_DIGITS : 20;
  const digits = Math.min(Math.max(Math.trunc(fractionDigits) || 0, 0), limit);
  if (typeof value === "string") {
    try {
      // Ungrouped output uses "." with no grouping, as String/toFixed below
      // do; either way it rounds the decimal, not a double.
      return renderCommas
        ? numberFormat(locale, { maximumFractionDigits: digits }).format(value)
        : numberFormat("en", {
            maximumFractionDigits: digits,
            useGrouping: false,
          }).format(value);
    } catch {
      // An engine before ECMA-402 2023 refuses more than 20 places; the
      // decimal itself is still the exact quantity.
      return value;
    }
  }
  if (renderCommas) {
    return numberFormat(locale, { maximumFractionDigits: digits }).format(
      value,
    );
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(digits).replace(/\.?0+$/, "");
};
