import currencies from "./ledger-currencies.json";

/**
 * The codes a new ledger can take: a copy of backend-v2's setup
 * `currencies.json`, which refuses anything else (w3/m62).
 */
export const LEDGER_CURRENCIES: readonly string[] =
  currencies.supportedCurrencies;

/**
 * What the server writes when a creation sends no currency. The form omits
 * the field for it, so choosing USD also works against a server older than
 * the `currency` argument.
 */
export const SERVER_DEFAULT_CURRENCY = "USD";

const SUPPORTED = new Set(LEDGER_CURRENCIES);
const REGION_CURRENCY = currencies.regionCurrency as Record<string, string>;

export const isLedgerCurrency = (code: string | null | undefined) =>
  !!code && SUPPORTED.has(code);

/** The region subtag of a BCP 47 tag (`en-GB` → `GB`), never its language. */
function regionOf(locale: string): string | undefined {
  try {
    const region = new Intl.Locale(locale).region;
    return region && /^[A-Z]{2}$/.test(region) ? region : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The currency the create form opens with (w3/m62): the saved profile
 * preference, then the currency of the first browser locale that names a
 * region, then USD.
 */
export function defaultLedgerCurrency({
  saved,
  locales = [],
}: {
  saved?: string | null;
  locales?: readonly string[];
}): string {
  if (isLedgerCurrency(saved)) return saved!;
  for (const locale of locales) {
    const region = regionOf(locale);
    const currency = region ? REGION_CURRENCY[region] : undefined;
    if (currency && SUPPORTED.has(currency)) return currency;
    if (region) break;
  }
  return SERVER_DEFAULT_CURRENCY;
}

/** The browser's preferred locales, empty where there is no browser. */
export function browserLocales(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean);
}
