import { BadUserInputError } from "@/shared/errors/domain-errors";

// Match the absolute end, including trailing newlines that `$` alone permits.
// Existing Gitea usernames may contain dots and uppercase letters.
export const LEDGER_OWNER_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9_.-]+(?![\s\S])/;
export const LEDGER_NAME_PATTERN = /^[a-z0-9_-]{1,100}(?![\s\S])/;
export const LEDGER_OWNER_RULE =
  "Owner slug must contain only letters, digits, dots, underscores, or hyphens and cannot be . or ..";
export const LEDGER_NAME_RULE =
  "Ledger name slug must contain 1-100 lowercase letters, digits, underscores, or hyphens";

/**
 * A username sent to the git host as one URL segment — a collaborator or a
 * profile to read or follow — is held to the owner-slug pattern, which every
 * existing account name fits. Anything else is `BAD_USER_INPUT` before an
 * upstream call, never a lookup with `/`, `?` or `#` in it.
 */
export function assertUsernameSegment(value: string, field: string): void {
  if (typeof value !== "string" || !LEDGER_OWNER_PATTERN.test(value)) {
    throw new BadUserInputError(
      `${field} must be a username: letters, digits, dots, underscores, or hyphens, and not . or ..`,
      field,
    );
  }
}

/**
 * A new ledger's name exactly as the ledger service stores it: lowercase
 * letters, digits and underscores joined by single hyphens, with at least
 * one letter or digit. The service slugifies whatever it is sent, so `x-`
 * was created as `x` and `a--b` as `a-b`, and the next call by the sent
 * name found nothing (w23/064). Addressing an existing ledger keeps the
 * wider {@link LEDGER_NAME_PATTERN}.
 */
export const NEW_LEDGER_NAME_PATTERN =
  /^(?=[a-z0-9_-]*[a-z0-9])[a-z0-9_]+(?:-[a-z0-9_]+)*$/;

/**
 * The ledger service's `slugify`, restated: packages share no code
 * (`backend-cluster/ledger/src/shared/ledger-name.ts` is the reference).
 */
function slugifyLedgerName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Why `name` can't name a new ledger, with the name to use when there is one. */
export function newLedgerNameRule(name: string): string {
  const slug = slugifyLedgerName(name);
  const use =
    slug !== name && NEW_LEDGER_NAME_PATTERN.test(slug)
      ? `; use '${slug}'`
      : "";
  return `A ledger name is lowercase letters, numbers, and underscores joined by single hyphens, with at least one letter or number${use}`;
}
