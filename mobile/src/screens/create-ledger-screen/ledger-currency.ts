import currencies from "./ledger-currencies.json";

/**
 * w3/m62: the create screen's one Currency field. The codes come from a copy of
 * backend-v2's setup `currencies.json`, which refuses anything else.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */

/** What the server writes when a creation sends no currency. */
export const SERVER_DEFAULT_CURRENCY = "USD";

const SUPPORTED: ReadonlySet<string> = new Set(currencies.supportedCurrencies);
const REGION_CURRENCY: Readonly<Record<string, string>> =
  currencies.regionCurrency;

export const isLedgerCurrency = (
  code: string | null | undefined,
): code is string => !!code && SUPPORTED.has(code);

/**
 * The currency the screen opens with: the saved profile preference, then the
 * device's own currency for its locale, then the device region's currency,
 * then USD.
 */
export function defaultLedgerCurrency({
  saved,
  nativeCurrency,
  region,
}: {
  saved?: string | null;
  nativeCurrency?: string | null;
  region?: string | null;
}): string {
  if (isLedgerCurrency(saved)) return saved;
  const native = nativeCurrency?.toUpperCase();
  if (isLedgerCurrency(native)) return native;
  const regionCurrency = region ? REGION_CURRENCY[region.toUpperCase()] : "";
  if (isLedgerCurrency(regionCurrency)) return regionCurrency;
  return SERVER_DEFAULT_CURRENCY;
}

/**
 * The currency a creation sends, or undefined to send CreateLedger exactly as
 * before the field existed. Only a Starter takes one, and USD is what the
 * server writes anyway. A server validates the whole document, so one that
 * declares `currency` is refused by a server older than the argument even
 * with no currency in it: everything but a non-USD Starter keeps the old
 * document.
 */
export function currencyToSend(values: {
  template: "STARTER" | "SAMPLE";
  currency: string;
}): string | undefined {
  return values.template === "STARTER" &&
    values.currency !== SERVER_DEFAULT_CURRENCY
    ? values.currency
    : undefined;
}
