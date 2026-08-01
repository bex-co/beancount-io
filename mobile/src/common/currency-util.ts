import CurrencyIcons from "currency-icons";

// The ledger's operating currencies come from `useLedgerMeta` (scoped to the
// selected ledger). The first entry is the ledger's primary operating currency
// and drives every displayed money symbol; `fallback` is used only when the
// ledger declares none.
export const getPrimaryCurrency = (
  currencies: string[],
  fallback = "USD",
): string => (currencies.length > 0 ? currencies[0] : fallback);

export const getCurrencySymbol = (currency: string) => {
  if (currency === "CNY") {
    return "¥";
  }
  return CurrencyIcons[currency]?.symbol || "";
};
