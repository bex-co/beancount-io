/**
 * Entry Context's balance rows. The server sends each account's balance as a
 * list, one string per currency or lot; read as a single value, `[]` showed
 * nothing and two currencies ran together as "100.00 USD,50.00 EUR" (w21/092).
 * Each amount gets its own line, since a lot string has commas of its own
 * (`10 HOOL {100.00 USD, 2026-01-01}`), and an empty list is a zero balance.
 */
export type EntryBalanceRow = { account: string; amounts: string[] };

const formatAmount = (amount: unknown): string => {
  if (
    typeof amount === "object" &&
    amount !== null &&
    "number" in amount &&
    "currency" in amount
  ) {
    const { number, currency } = amount as { number: string; currency: string };
    return `${number} ${currency}`;
  }
  return String(amount);
};

export function formatEntryBalances(balances: unknown): EntryBalanceRow[] {
  if (!balances || typeof balances !== "object") return [];
  return Object.entries(balances as Record<string, unknown>).map(
    ([account, value]) => {
      if (Array.isArray(value)) {
        const amounts = value.map(formatAmount).filter((text) => text !== "");
        return { account, amounts: amounts.length > 0 ? amounts : ["0"] };
      }
      return { account, amounts: [formatAmount(value)] };
    },
  );
}

/**
 * Whether a balance row stacks its amounts under the account: at large text
 * sizes, or when an amount carries a lot ("4.0000 QAETF {101.2500 USD,
 * 2026-10-21}"), which is wide enough to take the whole row and leave the
 * account no room (w21/863).
 */
export function stacksBalanceRow(
  amounts: readonly string[],
  largeText: boolean,
): boolean {
  return largeText || amounts.some((amount) => amount.includes("{"));
}
