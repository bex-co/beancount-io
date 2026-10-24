import {
  currencyMinorUnits,
  getCurrencySymbol,
  isFiatCurrency,
} from "./currency-util";
import { localizeDigits } from "./date-format";
import { absDecimal, parseDecimal, roundDecimal } from "./decimal-number";

const SHORT_NUMBER_SUFFIXES = [
  { value: 1, symbol: "" },
  { value: 1e3, symbol: "K" },
  { value: 1e6, symbol: "M" },
  { value: 1e9, symbol: "B" },
  { value: 1e12, symbol: "T" },
  { value: 1e15, symbol: "Q" },
];

type CompactStyle = {
  decimal: string;
  /** One per `SHORT_NUMBER_SUFFIXES` tier, spacing included. */
  suffixes: readonly string[];
  /** Whether the currency follows the number ("1,5 Tsd. $"). */
  currencyAfter: boolean;
};

/**
 * Each app language's short scale, after CLDR's short compact forms. The
 * English "K/M/B" read wrong elsewhere: German "B" is no abbreviation and
 * German *Billion* is 10¹² (w21/177). Hand-kept rather than
 * `Intl.NumberFormat`'s compact notation, which Hermes on iOS cannot be
 * relied on for. Compact values never appear in a `.bean` file, so unlike
 * full amounts (w3/189) they follow the language.
 */
const COMPACT_STYLES: Record<string, CompactStyle> = {
  en: {
    decimal: ".",
    suffixes: ["", "K", "M", "B", "T", "Q"],
    currencyAfter: false,
  },
  zh: {
    decimal: ".",
    suffixes: ["", "千", "百万", "十亿", "万亿", "千万亿"],
    currencyAfter: false,
  },
  bg: {
    decimal: ",",
    suffixes: ["", " хил.", " млн.", " млрд.", " трлн.", " квадрлн."],
    currencyAfter: true,
  },
  ca: {
    decimal: ",",
    suffixes: ["", " k", " M", " kM", " B", " kB"],
    currencyAfter: true,
  },
  de: {
    decimal: ",",
    suffixes: ["", " Tsd.", " Mio.", " Mrd.", " Bio.", " Brd."],
    currencyAfter: true,
  },
  es: {
    decimal: ",",
    suffixes: ["", " mil", " M", " mil M", " B", " mil B"],
    currencyAfter: true,
  },
  fa: {
    // The Arabic decimal separator, as Intl writes it in Persian (w21/933).
    decimal: "\u066b",
    suffixes: ["", " هزار", " میلیون", " میلیارد", " تریلیون", " کوادریلیون"],
    currencyAfter: false,
  },
  fr: {
    decimal: ",",
    suffixes: ["", " k", " M", " Md", " Bn", " Bd"],
    currencyAfter: true,
  },
  nl: {
    decimal: ",",
    suffixes: ["", "K", " mln.", " mld.", " bln.", " bld."],
    currencyAfter: false,
  },
  pt: {
    decimal: ",",
    suffixes: ["", " mil", " mi", " bi", " tri", " quatri"],
    currencyAfter: false,
  },
  ru: {
    decimal: ",",
    suffixes: ["", " тыс.", " млн", " млрд", " трлн", " квадрлн"],
    currencyAfter: true,
  },
  sk: {
    decimal: ",",
    suffixes: ["", " tis.", " mil.", " mld.", " bil.", " bld."],
    currencyAfter: true,
  },
  uk: {
    decimal: ",",
    suffixes: ["", " тис.", " млн", " млрд", " трлн", " квадрлн"],
    currencyAfter: true,
  },
};

const compactStyle = (locale: string): CompactStyle =>
  COMPACT_STYLES[locale.split(/[-_]/)[0]] ?? COMPACT_STYLES.en;

/**
 * A value below 1 with two significant digits: one decimal read 0.01, 0.02 and
 * 0.03 as "0.0" on a BTC chart's axis (w21/236). Trailing zeros are dropped.
 */
const fractionDigits = (value: number): string => {
  const places = Math.min(20, Math.max(1, 1 - Math.floor(Math.log10(value))));
  return value.toFixed(places).replace(/\.?0+$/, "");
};

export const shortNumber = (number: number | string, locale = "en"): string => {
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

  const { value } = SHORT_NUMBER_SUFFIXES[tier];
  const style = compactStyle(locale);
  const shortNum = absNum / value;
  // Whole values drop the decimal at every magnitude: "0", "50", "1K".
  const digits = Number.isInteger(shortNum)
    ? shortNum.toString()
    : (shortNum < 1 && tier === 0
        ? fractionDigits(shortNum)
        : shortNum.toFixed(1)
      ).replace(".", style.decimal);
  // Persian ticks use Persian digits, as the dates beside them do (w21/884);
  // full amounts stay Latin (w3/189).
  const written =
    locale.split(/[-_]/)[0] === "fa" ? localizeDigits(digits, locale) : digits;
  return sign + written + style.suffixes[tier];
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
  // Exponent notation ("5e-7", "1.5e-7") moves the point: read as a plain
  // "0" it showed a dust holding as "0 BTC" (w21/125).
  const exponent = /^([^eE]*)[eE]([+-]?\d+)$/.exec(number.trim());
  if (exponent) {
    return Math.max(0, amountScale(exponent[1]) - Number(exponent[2]));
  }
  const dot = number.indexOf(".");
  if (dot < 0) return 0;
  return number.length - dot - 1;
};

/** Significant decimal digits a double can be trusted for. */
const TRUSTED_DIGITS = 15;

/**
 * `value.toFixed(digits)`, except that digits a double does not hold are shown
 * as zeros instead of its binary noise: 1.234567890123456789 ETH printed
 * "1.234567890123456690" at 18 places, and 0.1 "0.100000000000000006"
 * (w21/594). A figure that needs more than 15 significant digits only reaches
 * here as a float; an amount read from the ledger's exact string goes through
 * `formatExactUnits`.
 */
const fixedDigits = (value: number, digits: number): string => {
  const fixed = value.toFixed(digits);
  if (fixed.replace(/\D/g, "").replace(/^0+/, "").length <= TRUSTED_DIGITS) {
    return fixed;
  }
  const trusted = value.toPrecision(TRUSTED_DIGITS);
  if (/e/i.test(trusted)) return fixed;
  const decimals = trusted.includes(".") ? trusted.split(".")[1].length : 0;
  if (digits <= decimals) return fixed;
  return `${trusted.includes(".") ? trusted : `${trusted}.`}${"0".repeat(digits - decimals)}`;
};

/**
 * An amount from its exact decimal string, grouped like `formatUnits`: no float
 * in the way, so 18 decimals of ETH read as the ledger wrote them. Null for text
 * that is not a plain decimal, where the caller formats the number instead.
 */
export const formatExactUnits = (
  text: string,
  currency: string,
  includePlus = false,
): string | null => {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!match) return null;
  const [, sign, whole, fraction] = match;
  const grouped = whole
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const amount = fraction === undefined ? grouped : `${grouped}.${fraction}`;
  const shownZero = !/[1-9]/.test(amount);
  const prefix = sign === "-" && !shownZero ? "-" : includePlus ? "+" : "";
  return `${prefix}${amount} ${currency}`;
};

/**
 * Group the integer part of a number with thousands separators and keep
 * `digits` decimals — two by default, for money (e.g. 1234.5 → "1,234.50"); a
 * commodity passes its recorded scale. Always non-negative — the sign is the
 * caller's concern. Hermes-safe (no `toLocaleString` reliance).
 */
export const groupThousands = (value: number, digits = 2): string => {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0;
  const fixed = fixedDigits(
    safe,
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
  const amount = groupThousands(normalized, digits);
  // The sign of what is shown, not of the raw float: a residue such as
  // -3.55e-15 rounds to 0.00 and must not read "-$0.00" (w21/055).
  const shownZero = !/[1-9]/.test(amount);
  return {
    sign: normalized < 0 && !shownZero ? "-" : includePlus ? "+" : "",
    amount,
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
 * `value` settled at money precision: a sum of monthly nets such as +10.10,
 * +20.20 and -30.30 lands on -3.6e-15, which a screen reader read out as
 * "$0.0000000000000036" (w21/597). A national currency rounds to its minor unit,
 * a commodity to eight places.
 */
export const roundMoney = (value: number, currency: string): number => {
  if (!Number.isFinite(value)) return value;
  const digits = isFiatCurrency(currency)
    ? currencyMinorUnits(currency)
    : COMMODITY_MONEY_DIGITS;
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  // Never a negative zero: it prints "-$0.00".
  return rounded === 0 ? 0 : rounded;
};

/** Most fraction digits a commodity shown as money keeps (a satoshi). */
export const COMMODITY_MONEY_DIGITS = 8;

/**
 * The fraction digits a money figure in `currency` is shown with. A national
 * currency keeps its minor unit (or `minScale`, when more). A commodity, BTC as
 * a ledger's operating currency, keeps the digits the value has, from two up to
 * eight: "Wallet (own) 0.00 BTC" for 0.004 and "Assets 1.51 BTC" for 1.507 hid
 * the very amounts the account journal showed (w21/595).
 */
const moneyDigits = (
  value: number,
  currency: string,
  minScale: number,
): number => {
  const base = Math.max(currencyMinorUnits(currency), minScale);
  if (isFiatCurrency(currency) || !Number.isFinite(value)) return base;
  const trimmed = Math.abs(value)
    .toFixed(COMMODITY_MONEY_DIGITS)
    .replace(/0+$/, "");
  const dot = trimmed.indexOf(".");
  const natural = dot < 0 ? 0 : trimmed.length - dot - 1;
  return Math.max(base, natural);
};

/** `moneyDigits` for an exact decimal from `parseDecimal`. */
const exactMoneyDigits = (
  value: string,
  currency: string,
  minScale: number,
): number => {
  const base = Math.max(currencyMinorUnits(currency), minScale);
  if (isFiatCurrency(currency)) return base;
  const trimmed = roundDecimal(
    absDecimal(value),
    COMMODITY_MONEY_DIGITS,
  ).replace(/0+$/, "");
  return Math.max(base, trimmed.length - trimmed.indexOf(".") - 1);
};

/**
 * `signedAmount` for an exact decimal, rounded half away from zero at
 * `digits`: the ledger's 9007199254740993 reads …993, where a double holds
 * …992 (w4/1039).
 */
const signedExactAmount = (
  value: string,
  includePlus: boolean,
  digits: number,
): { sign: string; amount: string } => {
  const rounded = roundDecimal(value, digits);
  const [whole, fraction] = absDecimal(rounded).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const amount = fraction === undefined ? grouped : `${grouped}.${fraction}`;
  const shownZero = !/[1-9]/.test(amount);
  return {
    sign: rounded.startsWith("-") && !shownZero ? "-" : includePlus ? "+" : "",
    amount,
  };
};

/**
 * An unsigned money string annotated with its currency (e.g. "$1,234.50",
 * "¥1,500" or "1,234.50 MUSD"), at the currency's minor unit or `minScale`
 * decimals when that is more. Use for absolute figures where the sign is not shown — a
 * running balance, a category total, an account row. Resolves the symbol from
 * the currency code and falls back to appending the code. Pass the ledger's
 * decimal string where the figure must stay exact.
 */
export const formatMoneyWithCurrency = (
  value: number | string,
  currency: string,
  minScale = 0,
): string => {
  const exact = typeof value === "string" ? parseDecimal(value) : null;
  if (exact !== null) {
    const digits = exactMoneyDigits(exact, currency, minScale);
    return annotateCurrency(
      "",
      signedExactAmount(absDecimal(exact), false, digits).amount,
      currency,
    );
  }
  const number = Number(value);
  return annotateCurrency(
    "",
    groupThousands(number, moneyDigits(number, currency, minScale)),
    currency,
  );
};

/**
 * A signed money string annotated with its currency, resolving the symbol from
 * the currency code. When the currency has a known symbol it is prefixed
 * (e.g. "-$1,234.50"); otherwise the currency code is appended after the amount
 * (e.g. "551,620.00 MUSD") so a custom or unrecognized commodity is never shown
 * as a bare, unlabeled number. Prefer this over `formatSignedMoney` wherever the
 * currency code is available. `minScale` keeps at least that many decimals, for
 * an exact figure finer than the currency's minor unit. Pass the ledger's
 * decimal string where the figure must stay exact.
 */
export const formatSignedMoneyWithCurrency = (
  value: number | string,
  currency: string,
  includePlus = false,
  minScale = 0,
): string => {
  const exact = typeof value === "string" ? parseDecimal(value) : null;
  const number = Number(value);
  const { sign, amount } =
    exact !== null
      ? signedExactAmount(
          exact,
          includePlus,
          exactMoneyDigits(exact, currency, minScale),
        )
      : signedAmount(
          number,
          includePlus,
          moneyDigits(number, currency, minScale),
        );
  return annotateCurrency(sign, amount, currency);
};

/**
 * A signed money string that names its currency by code ("-42.50 CAD"), for a
 * currency whose symbol another currency shown beside it shares (w21/535).
 */
export const formatSignedMoneyWithCode = (
  value: number,
  currency: string,
  includePlus = false,
  minScale = 0,
): string => {
  const { sign, amount } = signedAmount(
    value,
    includePlus,
    Math.max(currencyMinorUnits(currency), minScale),
  );
  return `${sign}${amount} ${currency}`;
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
  locale = "en",
): string => {
  const sign = value < 0 ? "-" : "";
  const amount = shortNumber(Math.abs(value), locale);
  const symbol = getCurrencySymbol(currency);
  // Where the language writes the currency after the number (w21/177).
  const text =
    symbol && compactStyle(locale).currencyAfter
      ? `${sign}${amount} ${symbol}`
      : annotateCurrency(sign, amount, currency);
  return isolateLeadingNumber(text);
};

/**
 * A short amount whose suffix word is right-to-left ("-$2 هزار") starts its
 * signed number as the left-to-right run it is: nothing isolated it, so the
 * suffix made the label right-to-left and the minus drew on the far side, a
 * deficit tick reading as a positive amount (w21/883). Text with no such
 * letter is returned as it was.
 */
const isolateLeadingNumber = (text: string): string => {
  // A symbol of Arabic script is already in its own isolate.
  if (text.includes("\u2067")) return text;
  // Letters only: Persian digits and their decimal mark are numbers, not the
  // suffix word (w21/933).
  const rtl = text.search(/[\u0590-\u065f\u066d-\u06ef\u06fa-\u08ff]/u);
  if (rtl <= 0) return text;
  const lead = text.slice(0, rtl).trimEnd();
  if (lead === "") return text;
  return `\u2066${lead}\u2069 ${text.slice(rtl)}`;
};
