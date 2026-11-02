import setupCurrencies from "./setup-currencies.json";
import timeZones from "./time-zone-regions.json";

/**
 * Where a suggested currency came from (ADR026). A selection the customer
 * already made in this flow is kept by the screen and never re-suggested.
 */
type CurrencySource = "saved" | "native" | "region" | "fallback";

export interface CurrencySuggestion {
  currency: string;
  source: CurrencySource;
  /**
   * The device time zone's currency when it differs: a one-tap candidate,
   * never preselected (ADR026 conflict check).
   */
  timeZoneCandidate?: string;
}

const SUPPORTED = new Set(setupCurrencies.supportedCurrencies);
const REGION_CURRENCY: Readonly<Record<string, string>> =
  setupCurrencies.regionCurrency;
const ZONE_REGION: Readonly<Record<string, string>> = timeZones.zoneRegion;

const supported = (code: string | null | undefined): code is string =>
  !!code && SUPPORTED.has(code.toUpperCase());

/**
 * Resolve the currency the creation screen preselects (ADR026): the saved
 * preference, then the OS's own currency for the locale, then the device
 * region through ADR021's region table, then USD. A time zone never selects
 * a currency; when its country's currency differs from a native, region, or
 * fallback preselection it is offered beside it. A saved preference is the
 * customer's own choice and gets no competing candidate.
 */
export function suggestCurrency({
  saved,
  nativeCurrency,
  region,
  timeZone,
}: {
  saved?: string | null;
  nativeCurrency?: string | null;
  region?: string | null;
  timeZone?: string | null;
}): CurrencySuggestion {
  if (supported(saved))
    return { currency: saved.toUpperCase(), source: "saved" };

  const regionCode = region?.toUpperCase();
  const regionCurrency =
    regionCode && /^[A-Z]{2}$/.test(regionCode)
      ? REGION_CURRENCY[regionCode]
      : undefined;
  const suggestion: CurrencySuggestion = supported(nativeCurrency)
    ? { currency: nativeCurrency.toUpperCase(), source: "native" }
    : regionCurrency
      ? { currency: regionCurrency, source: "region" }
      : { currency: "USD", source: "fallback" };

  const zoneRegion = timeZone ? ZONE_REGION[timeZone] : undefined;
  const zoneCurrency = zoneRegion ? REGION_CURRENCY[zoneRegion] : undefined;
  if (zoneCurrency && zoneCurrency !== suggestion.currency) {
    suggestion.timeZoneCandidate = zoneCurrency;
  }
  return suggestion;
}

/**
 * The currency to save as the preference after a ledger is created, or
 * undefined to save nothing (ADR026): a changed suggestion is saved; an
 * unchanged one only when nothing is stored, so the first ledger seeds it and
 * a later default never overwrites a deliberate choice.
 */
export function currencyToSave({
  chosen,
  suggested,
  saved,
}: {
  chosen: string;
  suggested: string;
  saved?: string | null;
}): string | undefined {
  if (chosen === saved) return undefined;
  if (chosen !== suggested || !saved) return chosen;
  return undefined;
}
