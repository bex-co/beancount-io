import type { AccountRoot, RootNames } from "../../common/account-root";

/** The five canonical Beancount account roots, in conventional display order. */
export const ACCOUNT_ROOT_PREFIXES = [
  "Assets",
  "Liabilities",
  "Equity",
  "Income",
  "Expenses",
] as const;

export type AccountRootPrefix = (typeof ACCOUNT_ROOT_PREFIXES)[number];

/**
 * What a ledger calls a root: its `option "name_assets" "Activos"` when it
 * renames one, else the canonical name. Open Account offered and wrote only
 * the English roots, so a renamed ledger got an `open Assets:…` for a root it
 * does not have (w21/073).
 */
export function ledgerRootName(
  root: AccountRootPrefix,
  roots: RootNames = {},
): string {
  return roots[root.toLowerCase() as AccountRoot] || root;
}

export type AccountNameValidationReason =
  | "invalidRoot"
  | "tooFewComponents"
  | "emptyComponent"
  | "componentMustStartUppercase"
  | "invalidCharacters";

export type AccountNameValidation =
  { ok: true } | { ok: false; reason: AccountNameValidationReason };

/** Join a selected root to a user-entered sub-path. */
export function composeAccountName(rootName: string, subPath: string): string {
  // NFC, so a keyboard's decomposed "É" (E + U+0301) is written composed and
  // the already-open check compares like with like (w21/041).
  const components = subPath
    .normalize("NFC")
    .split(":")
    .map((component) => component.trim())
    .filter(Boolean);

  return [rootName, ...components].join(":");
}

/**
 * Split a free-typed account string into the screen's root + sub-path state —
 * the inverse of `composeAccountName` for prefilled input. A canonical root is
 * matched case-insensitively so a lowercase search query still lands on the
 * right prefix; everything after it stays verbatim, letting the screen's normal
 * validation speak instead of silently rewriting what the user typed, except
 * that words separated by spaces become one component (`credit card` seeds
 * `CreditCard`), since a space is never valid in a name. A string
 * with no recognizable root becomes the sub-path under `fallbackRoot`.
 */
export function splitPrefillAccountName(
  input: string,
  fallbackRoot: AccountRootPrefix = "Assets",
  roots: RootNames = {},
): { rootPrefix: AccountRootPrefix; subPath: string } {
  const split = splitPrefillRoot(input, fallbackRoot, roots);
  return { ...split, subPath: joinPrefillWords(split.subPath) };
}

/**
 * An account component can't hold a space, so words typed into the search ("my
 * savings") become one component when they seed Create: `MySavings`, not a
 * name the form refuses (w21/255). Text without whitespace is untouched.
 */
function joinPrefillWords(subPath: string): string {
  if (!/\s/.test(subPath)) return subPath;
  return subPath
    .split(":")
    .map((component) =>
      component
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(""),
    )
    .join(":");
}

/**
 * What the root button reads aloud: the ledger's own name for the root, as the
 * visible prefix shows it. It said the canonical "Assets" beside a visible
 * "Activos:" on a ledger with `option "name_assets" "Activos"` (w21/629).
 */
export function rootButtonLabel(
  accountTypeLabel: string,
  rootPrefix: AccountRootPrefix,
  roots: RootNames = {},
): string {
  return `${accountTypeLabel}: ${ledgerRootName(rootPrefix, roots)}`;
}

/**
 * Words with a space between them join into one component as they are typed or
 * pasted, as they do after a root (w21/255): "Credit Card" and
 * "Assets:Credit Card" gave different results, the first refused (w21/628). A
 * trailing space, the one just typed after a word, is left alone so typing the
 * next word is not fought.
 */
function joinTypedWords(typed: string): string {
  return /\S\s+\S/.test(typed) ? joinPrefillWords(typed) : typed;
}

function splitPrefillRoot(
  input: string,
  fallbackRoot: AccountRootPrefix,
  roots: RootNames,
): { rootPrefix: AccountRootPrefix; subPath: string } {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  for (const root of ACCOUNT_ROOT_PREFIXES) {
    const name = ledgerRootName(root, roots);
    if (lower === name.toLowerCase()) {
      return { rootPrefix: root, subPath: "" };
    }
    if (lower.startsWith(`${name.toLowerCase()}:`)) {
      return { rootPrefix: root, subPath: trimmed.slice(name.length + 1) };
    }
  }
  return { rootPrefix: fallbackRoot, subPath: trimmed };
}

/**
 * The sub-path field's text with a typed root moved into the selector. The
 * app shows accounts by full name everywhere, so a pasted
 * `Assets:Bank:Checking` used to compose into `Assets:Assets:Bank:Checking`
 * (w21/004). Only a root followed by `:` is peeled — a bare `Assets` may still
 * be the start of a component — and the rest stays verbatim, so validation
 * still refuses what the user actually typed. Text without a leading root is
 * returned unchanged under the current root.
 */
export function peelTypedRoot(
  typed: string,
  currentRoot: AccountRootPrefix,
  roots: RootNames = {},
): { rootPrefix: AccountRootPrefix; subPath: string } {
  const lower = typed.trimStart().toLowerCase();
  const root = ACCOUNT_ROOT_PREFIXES.find((candidate) =>
    lower.startsWith(`${ledgerRootName(candidate, roots).toLowerCase()}:`),
  );
  return root
    ? splitPrefillAccountName(typed, root, roots)
    : { rootPrefix: currentRoot, subPath: joinTypedWords(typed) };
}

/**
 * Whether a subcomponent's initial character is one the engine accepts, as
 * probed against `@rustledger/wasm` 0.24 over every code point (w21/192):
 * an uppercase or titlecase letter ("Épargne", "ǅep"), any other letter that
 * is not cased, `\p{Lo}` ("日本", "العربية", "हिंदी"), or an ASCII digit
 * ("401k"). Not accepted, though they once passed here: a digit of another
 * script (Persian "۱۴۰۲", full-width "１２３", Devanagari "०"), a letter-like
 * numeral ("Ⅷ", "²nd"), a modifier letter ("ʰBank") and a lowercase letter.
 * Titlecase `ǅ` is neither `\p{Lu}` nor caseless, and is accepted (w21/041).
 */
const startsSubcomponent = (component: string): boolean => {
  const initial = [...component][0];
  return initial !== undefined && /^[\p{Lu}\p{Lt}\p{Lo}0-9]$/u.test(initial);
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

  // The root is one of the ledger's own root names (checked above), which the
  // ledger already accepts, renamed ones included (w21/073). Subcomponents
  // follow the Beancount grammar, which allows any Unicode uppercase letter or a
  // digit as the initial ("Assets:Épargne", "Assets:US:401k") and Unicode
  // letters, digits and hyphens in the body. Lowercase-led names, underscores
  // and spaces stay rejected.

  // Combining marks (`\p{M}`) may follow the initial: Devanagari vowel signs
  // in "हिंदी", or the U+0301 of a decomposed "É" that NFC cannot always fold.
  // The ledger accepts both, and refusing them disabled Done for a name it
  // would open (w21/041).
  for (const component of components.slice(1).map((c) => c.normalize("NFC"))) {
    if (!startsSubcomponent(component)) {
      return { ok: false, reason: "componentMustStartUppercase" };
    }
    // ZWNJ and ZWJ belong to Persian and Indic words ("خانه‌ها"); the engine
    // accepts them in the body, and refusing them blocked a name it opens
    // (w21/192).
    if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}\u200c\u200d-]*$/u.test(component)) {
      return { ok: false, reason: "invalidCharacters" };
    }
  }

  return { ok: true };
}

/**
 * Why the sub-path as typed cannot be submitted, before composition hides it.
 * `composeAccountName` drops empty components, so "Investments:" and
 * "Bank::Checking" compose into valid names the user did not type: a trailing
 * separator is a name still being typed, and an empty component inside it is
 * the mistake the form should name. Null when the typed text is complete (an
 * empty field is left to `validateAccountName`).
 */
export function typedSubPathIssue(
  subPath: string,
): "incomplete" | "emptyComponent" | null {
  const typed = subPath.trim();
  if (typed.length === 0) return null;
  const components = typed.split(":").map((component) => component.trim());
  if (components[components.length - 1] === "") return "incomplete";
  if (components.some((component) => component === "")) return "emptyComponent";
  return null;
}

/**
 * How the ledger spells `account`, among `accounts`, or undefined when it has
 * no such account. Compared as NFC: the typed name is composed in NFC, but a
 * ledger imported from a system that writes decomposed Unicode (macOS file
 * names, some bank exports) holds "Café" as "Cafe" + U+0301, which the engine
 * keeps as a different account that looks identical (w21/256). The ledger's
 * dates are keyed by its own spelling, so the notice looked them up with the
 * typed one and missed (w21/734).
 */
export function ledgerSpelling(
  account: string,
  accounts: readonly string[] | undefined,
): string | undefined {
  const wanted = account.normalize("NFC");
  return (
    accounts?.find((candidate) => candidate === account) ??
    accounts?.find((candidate) => candidate.normalize("NFC") === wanted)
  );
}

/**
 * Whether the form may submit, and whether a valid name is refused only
 * because the ledger already opens it. A second `open` for an account breaks
 * the ledger ("Duplicate open directive"), so the ledger's accounts must be
 * known first: until they load, a new name cannot be told from an existing
 * one. Beancount account names are case-sensitive, so only an exact match is
 * a duplicate (w0/037).
 */
export function openAccountSubmitState(input: {
  /** The composed name, as "Will be created as" shows it. */
  account: string;
  /** The name is complete and valid. */
  nameOk: boolean;
  /** Every account the ledger opens, or undefined until they load. */
  openAccounts: readonly string[] | undefined;
  /** A save is running or already committed. */
  busy: boolean;
}): { canSubmit: boolean; alreadyOpen: boolean } {
  const alreadyOpen =
    input.nameOk &&
    ledgerSpelling(input.account, input.openAccounts) !== undefined;
  return {
    alreadyOpen,
    canSubmit:
      input.nameOk &&
      input.openAccounts !== undefined &&
      !alreadyOpen &&
      !input.busy,
  };
}

/**
 * The currencies Open Account offers: the operating currencies first, in the
 * ledger's order, then every other commodity the ledger knows, sorted. Only
 * the operating currencies were offered, so an EUR bank account or a VTI
 * holding could not be constrained to its commodity (w21/085).
 */
export function openAccountCurrencyChoices(
  operating: readonly string[],
  all: readonly string[],
  typed: readonly string[] = [],
): string[] {
  const first = [...new Set(operating)];
  const rest = [...new Set([...all, ...typed])]
    .filter((currency) => !first.includes(currency))
    .sort();
  return [...first, ...rest];
}

/**
 * Beancount's commodity grammar: one uppercase letter, or an uppercase letter
 * then up to 22 of letters, digits and `'._-`, ending in a letter or digit
 * (EUR, VTI, USDC, A1B). The same rule the backend applies to a posting amount
 * (w21/190), so a typed code the app accepts the server accepts too.
 */
export function isCommodityCode(code: string): boolean {
  return /^[A-Z](?:[A-Z0-9'._-]{0,22}[A-Z0-9])?$/.test(code);
}

/**
 * A currency typed into Open Account's "Other…": trimmed and upper-cased, or
 * null when it is not a commodity code. The picker lists only commodities the
 * ledger has posted, so opening a first EUR, GBP or stock account had no way
 * to name its commodity (w21/234).
 */
export function typedCurrencyCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return isCommodityCode(code) ? code : null;
}

/**
 * What the name field says of an account the ledger already has: closed (it
 * can't be reopened, w21/122), opening after `today`, or open. One opened for
 * next month is not listed on Accounts yet (w21/614), so "already open" was
 * its only trace and read as a contradiction (w21/723). One closing after
 * today is still open, and Accounts lists it so: "was closed on December 31"
 * was false (w21/809).
 */
export function existingAccountNotice(
  closedAt: string | undefined,
  openedOn: string | undefined,
  today: string,
): {
  key:
    | "openAccountClosed"
    | "openAccountClosesLater"
    | "openAccountOpensLater"
    | "openAccountAlreadyOpen";
  date?: string;
} {
  if (closedAt && closedAt <= today) {
    return { key: "openAccountClosed", date: closedAt };
  }
  if (openedOn && openedOn > today) {
    return { key: "openAccountOpensLater", date: openedOn };
  }
  if (closedAt) return { key: "openAccountClosesLater", date: closedAt };
  return { key: "openAccountAlreadyOpen" };
}

/** What the Open Account form holds that Back would drop. */
export type OpenAccountDraft = {
  rootPrefix: string;
  subPath: string;
  currency: string;
  date: string;
};

/**
 * Whether Back drops a change: the name, and the type, currency and open date
 * too. Only the name was compared, so a type switched to Liabilities went
 * without asking (w21/810). `initial` holds what the form started with, its
 * currency the default it settled on once the ledger's were read.
 */
export function isOpenAccountDraftDirty(
  current: OpenAccountDraft,
  initial: OpenAccountDraft,
): boolean {
  return (
    current.subPath !== initial.subPath ||
    current.rootPrefix !== initial.rootPrefix ||
    current.currency !== initial.currency ||
    current.date !== initial.date
  );
}
