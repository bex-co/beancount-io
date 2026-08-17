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

  for (const component of components) {
    if (!/^[A-Z]/.test(component)) {
      return { ok: false, reason: "componentMustStartUppercase" };
    }
    if (!/^[A-Za-z0-9-]+$/.test(component)) {
      return { ok: false, reason: "invalidCharacters" };
    }
  }

  return { ok: true };
}
