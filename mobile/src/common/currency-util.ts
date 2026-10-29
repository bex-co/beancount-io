import CurrencyIcons from "currency-icons";
import { isolateRtlSymbol } from "./bidi";
import { currencyAfterNumber, localizeAmount } from "./number-locale";

// The ledger's operating currencies come from `useLedgerMeta` (scoped to the
// selected ledger). The first entry is the ledger's primary operating currency
// and drives every displayed money symbol; `fallback` is used only when the
// ledger declares none.
export const getPrimaryCurrency = (
  currencies: string[],
  fallback = "USD",
): string => (currencies.length > 0 ? currencies[0] : fallback);

// Where `currency-icons` gives a local-script or word symbol that does not
// read as a prefix: JPY's is "円", which rendered "円1,500.00" (w21/070).
// BHD's ".د.ب" carries a stray leading period, which landed against the digits,
// and the closing period of OMR, SDG and MAD landed against the minus, so they
// read as KWD's "د.ك" does (w21/698).
const SYMBOL_OVERRIDES: Record<string, string> = {
  BHD: "د.ب",
  CNY: "¥",
  JPY: "¥",
  MAD: "د.م",
  OMR: "ر.ع",
  SDG: "ج.س",
};

export const getCurrencySymbol = (currency: string) =>
  isolateRtlSymbol(
    SYMBOL_OVERRIDES[currency] ?? (CurrencyIcons[currency]?.symbol || ""),
  );

/**
 * A figure labelled as transaction rows and their detail label it: USD as
 * "$42.50", any other currency by its code, "42.50 CAD". In a ledger whose own
 * currency is another dollar (CAD, AUD, NZD, …), Home and Accounts already
 * show that one as "$", so USD reads "42.50 USD" there: the same "$" meant two
 * currencies one card apart (w21/699).
 */
export const labelRowAmount = (
  body: string,
  currency: string,
  operatingCurrency?: string,
): string => {
  const written = localizeAmount(body);
  if (
    currency === "USD" &&
    (operatingCurrency === undefined ||
      operatingCurrency === "USD" ||
      getCurrencySymbol(operatingCurrency) !== "$")
  ) {
    return currencyAfterNumber() ? `${written} $` : `$${written}`;
  }
  return `${written} ${currency}`;
};

/**
 * The currency a ledger's headline figures read in: its first operating
 * currency, else the first commodity it holds that is a known currency (a stock
 * ticker is not one), else the first commodity at all, and USD only for a ledger
 * with no commodity yet. A ledger without `option "operating_currency"` showed
 * Home as $0.00 USD with every amount under "Not in total" (w21/415).
 */
export const ledgerPrimaryCurrency = (
  operating: readonly string[],
  commodities: readonly string[],
): string =>
  operating[0] ??
  commodities.find((code) => getCurrencySymbol(code) !== "") ??
  commodities[0] ??
  "USD";

// ISO 4217 minor units that differ from the usual two. The yen and won have no
// minor unit, so "¥1,500.00" was wrong; the dinars carry three (w21/070).
const MINOR_UNITS: Record<string, number> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};

/**
 * Decimal places money in `currency` is shown with: its ISO 4217 minor unit,
 * or two for any other code, custom commodities included.
 */
export const currencyMinorUnits = (currency: string): number =>
  MINOR_UNITS[currency] ?? 2;

/**
 * Whether `currency` is a national currency the app knows (it has a symbol or
 * an ISO 4217 minor unit), as opposed to a commodity: BTC, a stock, a custom
 * unit. Money in a commodity is not given the two cents of a fiat currency
 * (w21/595).
 */
export const isFiatCurrency = (currency: string): boolean =>
  currency in MINOR_UNITS || getCurrencySymbol(currency) !== "";
