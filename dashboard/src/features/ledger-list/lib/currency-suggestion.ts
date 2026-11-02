import currencies from "./setup-currencies.json";
import timeZones from "./time-zone-regions.json";

/**
 * Where a suggested currency came from (ADR026). A selection the customer
 * already made in this flow is kept by the form and never re-suggested.
 */
export type CurrencySource = "saved" | "region" | "fallback";

export interface CurrencySuggestion {
  currency: string;
  source: CurrencySource;
  /**
   * The browser time zone's currency when it differs: a one-tap candidate,
   * never preselected (ADR026 conflict check).
   */
  timeZoneCandidate?: string;
}

const SUPPORTED = new Set(currencies.supportedCurrencies);
const REGION_CURRENCY = currencies.regionCurrency as Record<string, string>;
const ZONE_REGION = timeZones.zoneRegion as Record<string, string>;

export const isSupportedCurrency = (code: string | null | undefined) =>
  !!code && SUPPORTED.has(code);

/** The region subtag of a BCP 47 tag (`en-US` → `US`), never its language. */
function regionOf(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    const region = new Intl.Locale(locale).region;
    if (region && /^[A-Z]{2}$/.test(region)) return region;
  } catch {
    // Not a valid tag: no region.
  }
  return undefined;
}

/**
 * Resolve the currency a creation flow preselects, once, before the details
 * step (ADR026): the saved preference, then the browser region through
 * ADR021's region table, then USD. A time zone never selects a currency; when
 * its country's currency differs from the preselection it is offered beside
 * it. A saved preference is the customer's own choice, so it gets no
 * competing candidate.
 */
export function suggestCurrency({
  saved,
  locale,
  timeZone,
}: {
  saved?: string | null;
  locale?: string;
  timeZone?: string;
}): CurrencySuggestion {
  if (isSupportedCurrency(saved)) return { currency: saved!, source: "saved" };

  const region = regionOf(locale);
  const regionCurrency = region ? REGION_CURRENCY[region] : undefined;
  const zoneRegion = timeZone ? ZONE_REGION[timeZone] : undefined;
  const zoneCurrency = zoneRegion ? REGION_CURRENCY[zoneRegion] : undefined;

  const suggestion: CurrencySuggestion = regionCurrency
    ? { currency: regionCurrency, source: "region" }
    : { currency: "USD", source: "fallback" };
  if (zoneCurrency && zoneCurrency !== suggestion.currency) {
    suggestion.timeZoneCandidate = zoneCurrency;
  }
  return suggestion;
}

/** The browser's own inputs to `suggestCurrency`. */
export function browserCurrencyInputs(): {
  locale?: string;
  timeZone?: string;
} {
  if (typeof navigator === "undefined") return {};
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  return { locale: navigator.language, timeZone };
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
