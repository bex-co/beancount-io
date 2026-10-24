/**
 * Beancount account names are colon-separated components with no spaces.
 * Each component starts with an uppercase, titlecase (`ǅ`) or caseless letter,
 * or an ASCII digit, then letters, combining marks, numbers, the zero-width
 * joiners or hyphens — matching what the ledger accepts (hyphenated, numeric,
 * accented, decomposed `É` and Devanagari `हिंदी` names, w4/279; Persian
 * `فارسی‌حساب` with its ZWNJ, `Qa²` and `QaⅣ`, w4/1048) while rejecting empty
 * segments, whitespace, lowercase-leading Latin components like
 * `Assets:checking`, and components the ledger cannot parse that start with
 * another script's digits (`١٢٣`, `１２３`). Names are kept as authored, never
 * normalized.
 */
const ACCOUNT_COMPONENT =
  /^[\p{Lu}\p{Lt}\p{Lo}0-9](?:[\p{L}\p{M}\p{N}-]|\u200C|\u200D)*$/u;

/** Why a name is not a complete account token (w0/017). */
export type AccountTokenProblem =
  | { kind: "incomplete" }
  | { kind: "whitespace" }
  | { kind: "empty-component" }
  | { kind: "component-start"; component: string }
  | { kind: "invalid-character"; component: string };

const COMPONENT_START = /^[\p{Lu}\p{Lt}\p{Lo}0-9]/u;

/**
 * The first reason `account` is not a complete account token, or `null` when
 * it is one. Lets forms say *why* — a lowercase `Assets:bank` was once told to
 * remove spaces and empty parts it never had.
 */
export function accountTokenProblem(
  account: string,
): AccountTokenProblem | null {
  if (account.length === 0) return { kind: "incomplete" };
  if (/\s/.test(account)) return { kind: "whitespace" };
  const parts = account.split(":");
  if (parts.length < 2) return { kind: "incomplete" };
  if (parts.some((part) => part.length === 0)) {
    return { kind: "empty-component" };
  }
  for (const component of parts) {
    if (ACCOUNT_COMPONENT.test(component)) continue;
    return COMPONENT_START.test(component)
      ? { kind: "invalid-character", component }
      : { kind: "component-start", component };
  }
  return null;
}

export function isCompleteAccountToken(account: string): boolean {
  return accountTokenProblem(account) === null;
}
