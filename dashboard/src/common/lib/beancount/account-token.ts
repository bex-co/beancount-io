/**
 * Beancount account names are colon-separated components with no spaces.
 * Each component starts with an uppercase letter, caseless letter, or digit,
 * then letters, digits, or hyphens — matching the live Open Account controls
 * (hyphenated, numeric, and accented names) while rejecting empty segments,
 * whitespace, and lowercase-leading Latin components like `Assets:checking`.
 */
const ACCOUNT_COMPONENT = /^[\p{Lu}\p{Lo}\p{Nd}][\p{L}\p{Nd}-]*$/u;

export function isCompleteAccountToken(account: string): boolean {
  if (account.length === 0 || /\s/.test(account)) return false;
  const parts = account.split(":");
  if (parts.length < 2) return false;
  if (parts.some((part) => part.length === 0)) return false;
  return parts.every((part) => ACCOUNT_COMPONENT.test(part));
}
