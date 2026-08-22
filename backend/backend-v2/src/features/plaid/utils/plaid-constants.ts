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
