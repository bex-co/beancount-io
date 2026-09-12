/** The five canonical Beancount account roots, in conventional display order. */
export const ACCOUNT_ROOT_PREFIXES = [
  "Assets",
  "Liabilities",
  "Equity",
  "Income",
  "Expenses",
] as const;

export type AccountRootPrefix = (typeof ACCOUNT_ROOT_PREFIXES)[number];

export type AccountNameValidationReason =
  | "invalidRoot"
  | "tooFewComponents"
  | "emptyComponent"
  | "componentMustStartUppercase"
  | "invalidCharacters";

export type AccountNameValidation =
  { ok: true } | { ok: false; reason: AccountNameValidationReason };

/** Join a selected root to a user-entered sub-path. */
export function composeAccountName(
  rootPrefix: AccountRootPrefix,
  subPath: string,
): string {
  const components = subPath
    .split(":")
    .map((component) => component.trim())
    .filter(Boolean);

  return [rootPrefix, ...components].join(":");
}

/**
 * Split a free-typed account string into the screen's root + sub-path state —
 * the inverse of `composeAccountName` for prefilled input. A canonical root is
 * matched case-insensitively so a lowercase search query still lands on the
 * right prefix; everything after it stays verbatim, letting the screen's normal
 * validation speak instead of silently rewriting what the user typed. A string
 * with no recognizable root becomes the sub-path under `fallbackRoot`.
 */
export function splitPrefillAccountName(
  input: string,
  fallbackRoot: AccountRootPrefix = "Assets",
): { rootPrefix: AccountRootPrefix; subPath: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  for (const root of ACCOUNT_ROOT_PREFIXES) {
    if (lower === root.toLowerCase()) {
      return { rootPrefix: root, subPath: "" };
    }
    if (lower.startsWith(`${root.toLowerCase()}:`)) {
      return { rootPrefix: root, subPath: trimmed.slice(root.length + 1) };
    }
  }
  return { rootPrefix: fallbackRoot, subPath: trimmed };
}

/**
 * Whether a subcomponent's initial character is one Beancount accepts.
 *
 * Allowed: a Unicode uppercase letter ("Épargne"), a digit ("401k"), and a
 * letter from a caseless script ("日本", "العربية"). That last case is why this
 * is not a single `\p{Lu}` test: Han and Kana are `\p{Lo}`, so an uppercase-only
 * rule rejects names the ledger grammar allows. A letter is treated as caseless
 * when it has no distinct uppercase form, which still rejects a lowercase-led
 * Latin, Greek or Cyrillic name.
 */
const startsSubcomponent = (component: string): boolean => {
  const initial = [...component][0];
  if (initial === undefined) return false;
  if (/\p{N}/u.test(initial)) return true;
  if (/\p{Lu}/u.test(initial)) return true;
  return /\p{L}/u.test(initial) && initial.toUpperCase() === initial;
};

/** Validate a full account name using Beancount's component naming rules. */
export function validateAccountName(
  name: string,
  rootPrefixes: readonly string[] = ACCOUNT_ROOT_PREFIXES,
): AccountNameValidation {
  const components = name.split(":");

  if (components.length < 2) {
    return { ok: false, reason: "tooFewComponents" };
  }
  if (!rootPrefixes.includes(components[0])) {
    return { ok: false, reason: "invalidRoot" };
  }
  if (components.some((component) => component.length === 0)) {
    return { ok: false, reason: "emptyComponent" };
  }

  // The root is one of the five canonical ASCII names (already checked above),
  // so it keeps the strict ASCII rules. Subcomponents follow the Beancount
  // grammar, which allows any Unicode uppercase letter or a digit as the initial
  // ("Assets:Épargne", "Assets:US:401k") and Unicode letters, digits and hyphens
  // in the body. Lowercase-led names, underscores and spaces stay rejected.
  if (!/^[A-Z]/.test(components[0])) {
    return { ok: false, reason: "componentMustStartUppercase" };
  }
  if (!/^[A-Za-z0-9-]+$/.test(components[0])) {
    return { ok: false, reason: "invalidCharacters" };
  }

  for (const component of components.slice(1)) {
    if (!startsSubcomponent(component)) {
      return { ok: false, reason: "componentMustStartUppercase" };
    }
    if (!/^[\p{L}\p{N}-]+$/u.test(component)) {
      return { ok: false, reason: "invalidCharacters" };
    }
  }

  return { ok: true };
}
