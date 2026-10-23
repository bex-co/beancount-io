import { escapeFilterRegex } from "@/common/components/ledger-search-controls/utils";

/**
 * The reader's filter narrowed to transactions that post to one of
 * `cashAccounts`, for the activity reads; closing balances keep the reader's
 * own filter. The direct method explains changes in cash, so only such a
 * transaction is cash activity: a purchase charged wholly to a card otherwise
 * read as an operating outflow and an equal financing inflow, though no cash
 * moved (w4/m56). The reader's filter is parenthesized so its `,` (OR) stays
 * inside it. One exact pattern per account keeps each under the filter's
 * pattern-length limit, and an empty membership matches no transaction
 * rather than every one.
 */
export function cashActivityFilter(
  filter: string | null | undefined,
  cashAccounts: readonly string[],
): string {
  const legs =
    cashAccounts.length > 0
      ? cashAccounts.map(
          (account) => `account:"^${escapeFilterRegex(account)}$"`,
        )
      : ['account:"^$"'];
  const cash = `any(${legs.join(", ")})`;
  const own = filter?.trim();
  return own ? `(${own}) ${cash}` : cash;
}
