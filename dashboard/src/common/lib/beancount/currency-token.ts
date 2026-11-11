/**
 * Beancount's commodity syntax, as the ledger checks it before a write
 * (w23/033): a capital letter, then capitals, digits and `' . _ -`, ending in
 * a capital or digit, at most 24 characters; or a futures contract, a slash
 * then a capital (`/ESZ24`, w21/651). A lowercase `usd` was sent and refused
 * as "information provided is invalid" (w2/114).
 */
const CURRENCY_TOKEN =
  /^(?:[A-Z](?:[A-Z0-9'._-]{0,22}[A-Z0-9])?|\/[A-Z](?:[A-Z0-9'._-]{0,21}[A-Z0-9])?)$/;

export function isCurrencyToken(value: string): boolean {
  return CURRENCY_TOKEN.test(value);
}
