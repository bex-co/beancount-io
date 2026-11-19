/** An amount in one currency or commodity. */
export type CurrencyAmount = {
  currency: string;
  value: number;
  /**
   * The decimal the ledger sent, when there is one. Text and differences use
   * it: a double rounds a large balance (9007199254740993) before either sees
   * it (w4/m52). `value` stays for sorting and chart coordinates.
   */
  exact?: string;
};

/** The preferred currency first, then the rest alphabetically. */
export function prioritizeCurrency(
  amounts: CurrencyAmount[],
  preferredCurrency: string,
): CurrencyAmount[] {
  return [...amounts].sort((a, b) => {
    if (a.currency === preferredCurrency) return -1;
    if (b.currency === preferredCurrency) return 1;
    return a.currency.localeCompare(b.currency);
  });
}
