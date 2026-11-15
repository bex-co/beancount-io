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
 * restates the beancount lexer's account token (`lexesAsAccount`) rather
 * than running it, refusing the spaces and controls the lexer would take.
 */

const TYPE = "[\\p{Lu}][\\p{L}\\p{Nd}\\-]*";
const NAME = "[\\p{Lu}\\p{Nd}][\\p{L}\\p{Nd}\\-]*";

/** Beancount `account.ACCOUNT_RE`, fullmatched by `is_valid`. */
const ACCOUNT_RE = new RegExp(`^(?:${TYPE})(?::${NAME})+$`, "u");

/** The same pattern unanchored at the end, as the grammar matches a token. */
const ACCOUNT_PREFIX_RE = new RegExp(`^(?:${TYPE})(?::${NAME})+`, "u");

/** Control characters and bidirectional overrides, as `CONTROL_CHARACTERS`. */
const REFUSED =
  // eslint-disable-next-line no-control-regex -- the control ranges are the point: this mirrors Python's refused set exactly.
  /[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/;

/**
 * A non-ASCII character inside an account token. The lexer takes any; a
 * space or a control ends the name here, as `bea` refuses one in a name.
 */
const WIDE = "[^\\p{ASCII}\\s\\p{Cc}]";

/** One character of an account token: ASCII letters, digits and `-`, or `WIDE`. */
export const ACCOUNT_CHAR = new RegExp(`[A-Za-z0-9-]|${WIDE}`, "u");

/**
 * The lexer's account token, whole: a root starting with A-Z, then one or
 * more `:` components starting with A-Z or 0-9, each continuing with ASCII
 * letters, digits and `-`; a non-ASCII character may stand anywhere.
 */
const ACCOUNT_TOKEN_RE = new RegExp(
  `^(?:[A-Z]|${WIDE})(?:[A-Za-z0-9-]|${WIDE})*(?::(?:[A-Z0-9]|${WIDE})(?:[A-Za-z0-9-]|${WIDE})*)+$`,
  "u",
);

/**
 * Whether the lexer reads `value` as one account token. The hosted engine
 * loads every such name, so a ledger can hold `Expenses:日本`, which stock
 * Beancount refuses.
 */
export function lexesAsAccount(value: string): boolean {
  return !REFUSED.test(value) && ACCOUNT_TOKEN_RE.test(value);
}

/**
 * `_loads_as_account`: whether stock Beancount loads `value` as an account,
 * its root aside (roots are ledger options). The lexer reads one token and
 * the grammar matches the account pattern at its start without anchoring
 * the end, so `Expenses:Food:日本` loads although `is_valid` refuses it,
 * while `Expenses:日本` does not.
 */
export function loadsAsAccount(value: string): boolean {
  return lexesAsAccount(value) && ACCOUNT_PREFIX_RE.test(value);
}

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
