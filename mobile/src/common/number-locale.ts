import { localizeDigits } from "./date-format";

type NumberStyle = {
  /** Between groups of three digits. */
  group: string;
  decimal: string;
  /** Fewest digits before the first group mark: 2 writes 1234 whole, 12.345 grouped. */
  minGroupDigits: 1 | 2;
  /** Whether a currency symbol follows the number ("1.234,50 €"). */
  currencyAfter: boolean;
  /** Whether the language writes its own digits (Persian). */
  localDigits: boolean;
};

const EN: NumberStyle = {
  group: ",",
  decimal: ".",
  minGroupDigits: 1,
  currencyAfter: false,
  localDigits: false,
};

const comma = (
  group: string,
  currencyAfter: boolean,
  minGroupDigits: 1 | 2 = 1,
): NumberStyle => ({
  group,
  decimal: ",",
  minGroupDigits,
  currencyAfter,
  localDigits: false,
});

/**
 * How each app language writes a full amount, after CLDR. The currency
 * position matches `COMPACT_STYLES` in `number-utils.ts`, so a chart's ticks
 * and the amounts beside them agree (w21/882). Hand-kept rather than
 * `Intl.NumberFormat`, which Hermes on iOS cannot be relied on for.
 */
const NUMBER_STYLES: Record<string, NumberStyle> = {
  en: EN,
  zh: EN,
  bg: comma(" ", true, 2),
  ca: comma(".", true),
  de: comma(".", true),
  es: comma(".", true, 2),
  fa: {
    group: "٬",
    decimal: "٫",
    minGroupDigits: 1,
    currencyAfter: false,
    localDigits: true,
  },
  fr: comma(" ", true),
  nl: comma(".", false),
  pt: comma(".", false),
  ru: comma(" ", true),
  sk: comma(" ", true),
  uk: comma(" ", true),
};

const base = (locale: string) => locale.split(/[-_]/)[0];

let activeLocale = "en";

/** Set by the translations module whenever the app language changes. */
export const setNumberLocale = (locale: string): void => {
  activeLocale = locale;
};

const activeStyle = (): NumberStyle => NUMBER_STYLES[base(activeLocale)] ?? EN;

/** Whether the app language writes the currency after the number. */
export const currencyAfterNumber = (): boolean => activeStyle().currencyAfter;

/**
 * An English-formatted unsigned amount ("1,234.50") written in the app
 * language ("1.234,50"). The one place a full amount takes its separators, so
 * every money string follows the language, as the chart ticks do.
 */
export const localizeAmount = (english: string): string => {
  const style = activeStyle();
  if (style === EN) return english;
  const written = english.replace(/\d[\d,]*(?:\.\d+)?/g, (run) => {
    const [whole, fraction] = run.split(".");
    const digits = whole.replace(/,/g, "");
    const grouped =
      style.minGroupDigits === 2 && digits.length === 4
        ? digits
        : digits.replace(/\B(?=(\d{3})+(?!\d))/g, style.group);
    return fraction === undefined
      ? grouped
      : grouped + style.decimal + fraction;
  });
  return style.localDigits ? localizeDigits(written, activeLocale) : written;
};
