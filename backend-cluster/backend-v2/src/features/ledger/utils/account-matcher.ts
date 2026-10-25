import { BadUserInputError } from "@/shared/errors";

/**
 * `bea report --account`'s matcher, mirroring Fava's `account_predicate`
 * (`cli/src/fava/core/filters.py`, Beancount.io changes included).
 *
 * A value spelled as an account name — beancount-valid, a ledger root, or
 * loader-accepted (non-Latin leaves) — matches that account and its
 * descendants, anchored at the start, so `Expenses:Food` never picks up
 * its prefix sibling `Expenses:FoodTruck`. Anything else is a
 * case-insensitive regex search, falling back to literal equality when
 * the pattern does not compile. An absent filter matches everything.
 *
 * Two deliberate divergences from the Python original: exotic
 * Python-only regex syntax (`(?P<…>`, `\A`, `\Z`) does not compile in
 * JavaScript and falls back to equality, and the loader-acceptance check
 * approximates the beancount lexer (ASCII account characters or
 * non-control non-ASCII, plus an unanchored account-pattern prefix)
 * rather than running it.
 */

const TYPE = "[\\p{Lu}][\\p{L}\\p{Nd}\\-]*";
const NAME = "[\\p{Lu}\\p{Nd}][\\p{L}\\p{Nd}\\-]*";

/** Beancount `account.ACCOUNT_RE`, fullmatched by `is_valid`. */
const ACCOUNT_RE = new RegExp(`^(?:${TYPE})(?::${NAME})+$`, "u");

/** The same pattern unanchored at the end, as `_loads_as_account` uses. */
const ACCOUNT_PREFIX_RE = new RegExp(`^(?:${TYPE})(?::${NAME})+`, "u");

/** Control characters and bidirectional overrides, as `CONTROL_CHARACTERS`. */
// eslint-disable-next-line no-control-regex -- the control ranges are the point: this mirrors Python's refused set exactly.
const REFUSED = /[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/;

/** ASCII the account lexer takes inside one token. */
const TOKEN_ASCII = /^[A-Za-z0-9:-]$/;

/**
 * Whether the value is spelled as an account name: beancount-valid, one
 * of the ledger's roots, or loader-accepted like a non-Latin leaf.
 */
export function isAccountSpelling(
  value: string,
  roots: readonly string[],
): boolean {
  if (ACCOUNT_RE.test(value)) return true;
  if (roots.includes(value)) return true;
  return loadsAsAccount(value);
}

/** `_loads_as_account` approximated without the beancount lexer. */
function loadsAsAccount(value: string): boolean {
  if (REFUSED.test(value)) return false;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code < 0x80 && !TOKEN_ASCII.test(char)) return false;
  }
  return ACCOUNT_PREFIX_RE.test(value);
}

/**
 * Refuse a pattern that is neither an account spelling nor a compilable
 * regular expression — `_invalid_pattern`: without this the match below
 * falls back to equality and silently misses accounts.
 */
export function assertValidAccountPattern(pattern: string): void {
  try {
    new RegExp(pattern);
  } catch (error) {
    const reason =
      error instanceof Error && error.message !== ""
        ? error.message
        : "cannot be compiled";
    throw new BadUserInputError(
      `Invalid account filter '${pattern}': ${reason}. Pass a parent account such as Expenses:Food, or a regular expression such as 'Expenses:(Food|Rent)'.`,
    );
  }
}

/** Whether one account name satisfies an `--account` filter. */
export function matchesAccountPattern(
  pattern: string | undefined,
  name: string,
  roots: readonly string[],
): boolean {
  if (!pattern) return true;
  if (isAccountSpelling(pattern, roots)) {
    return name === pattern || name.startsWith(`${pattern}:`);
  }
  try {
    return new RegExp(pattern, "i").test(name);
  } catch {
    return name === pattern;
  }
}
