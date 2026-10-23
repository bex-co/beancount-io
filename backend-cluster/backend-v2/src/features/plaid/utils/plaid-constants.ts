import { CountryCode } from "plaid";

/**
 * Plaid configuration constants
 */

/**
 * Supported country codes for Plaid integration
 * US and CA are the primary markets supported
 */
export const PLAID_COUNTRY_CODES: CountryCode[] = [
  CountryCode.Us,
  CountryCode.Ca,
];

/**
 * The `import-id` a hosted bank import writes on its entry: the shared
 * convention's bank-feed prefix (skills/beancount-import/references/dedup.md)
 * and Plaid's own transaction id, so the ledger itself records what was
 * imported and a CLI import of the same account can exact-match it (w5/941).
 */
export function plaidImportId(transactionId: string): string {
  return `plaid:${transactionId}`;
}
