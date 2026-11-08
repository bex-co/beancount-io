import { graphQLErrorExtensions } from "../../common/graphql-error-codes";

/**
 * Slugify a ledger name to match GitHub-style repository naming.
 * Mirrors the dashboard helper and backend ledger name rules.
 */
export function slugifyLedgerName(text: string): string {
  return text
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * What the server accepts as a new ledger's name: lowercase letters, digits and
 * underscores joined by single hyphens, with at least one letter or digit. A
 * copy of backend-v2's `NEW_LEDGER_NAME_PATTERN` (packages share no code), pinned
 * by `ledger-name.test.ts`. A name of only underscores or hyphens passed the
 * form's "something is left after slugifying" check and was refused on Create
 * with a generic message (w21/547).
 */
const NEW_LEDGER_NAME_PATTERN =
  /^(?=[a-z0-9_-]*[a-z0-9])[a-z0-9_]+(?:-[a-z0-9_]+)*$/;

/** The longest ledger name the server takes, counted on the slug (w21/992). */
const LEDGER_NAME_MAX = 100;

/**
 * Whether the name's slug is within the server's limit. The server counts the
 * name after transformation, so a typed "a" × 100 and two spaces (102
 * characters) is a 100-character name, and the form refused it on its raw
 * length.
 */
export function ledgerNameWithinLimit(name: string): boolean {
  return slugifyLedgerName(name).length <= LEDGER_NAME_MAX;
}

/** Whether `name` slugifies to a name the server will create. */
export function isNewLedgerName(name: string): boolean {
  return NEW_LEDGER_NAME_PATTERN.test(slugifyLedgerName(name));
}

/**
 * The slug to preview under the name field ("Will be created as …"), or null
 * when there is nothing worth showing: the name is already the slug, or it
 * slugifies away entirely (the form's own validation reports that case). A
 * change of case alone is a change — "MyBook" is created as "mybook" — so the
 * name is compared as typed, trimmed (w21/477).
 */
export function ledgerSlugPreview(name: string): string | null {
  const slug = slugifyLedgerName(name);
  return slug.length > 0 && slug !== name.trim() ? slug : null;
}

/**
 * Default name that does not collide with existing ledger names:
 * `my-book`, then `my-book-1`, `my-book-2`, …
 */
export function generateDefaultLedgerName(existingNames: string[]): string {
  const baseName = "my-book";
  if (!existingNames.includes(baseName)) {
    return baseName;
  }
  let counter = 1;
  while (existingNames.includes(`${baseName}-${counter}`)) {
    counter += 1;
  }
  return `${baseName}-${counter}`;
}

export type CreateLedgerErrorKind =
  "conflict" | "reserved" | "creating" | "tier" | "description" | "other";

/** The longest ledger description the server takes, in code points as Gitea counts them (w21/949). */
export const LEDGER_DESCRIPTION_MAX = 2048;

function isReservedName(error: unknown): boolean {
  const gqlErrors = (
    error as {
      graphQLErrors?: Array<{ extensions?: { reasonCode?: string } }>;
    }
  )?.graphQLErrors;
  return (
    Array.isArray(gqlErrors) &&
    gqlErrors.some(
      (err) => err.extensions?.reasonCode === "LEDGER_NAME_RESERVED",
    )
  );
}

/** Map backend createLedger failures to field/form error kinds. */
export function classifyCreateLedgerError(
  error: unknown,
): CreateLedgerErrorKind {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = message.toLowerCase();
  // A renamed ledger's former name: no ledger has it, so "already exists" would
  // be false. Its message also says "choose a different name", so the reason is
  // read before any text (w21/566).
  if (isReservedName(error)) return "reserved";
  if (lower.includes("still in progress")) return "creating";
  if (lower.includes("ledger description can be at most")) return "description";
  if (
    lower.includes("already exists") ||
    lower.includes("name conflict") ||
    lower.includes("choose a different name")
  ) {
    return "conflict";
  }
  if (
    lower.includes("resource_limit") ||
    lower.includes("resource limit") ||
    lower.includes("ledger limit") ||
    lower.includes("max ledgers")
  ) {
    return "tier";
  }
  // Apollo packages GraphQL errors under graphQLErrors.
  const gqlErrors = (
    error as {
      graphQLErrors?: Array<{
        message?: string;
        extensions?: { code?: string };
      }>;
    }
  )?.graphQLErrors;
  if (Array.isArray(gqlErrors)) {
    for (const err of gqlErrors) {
      const code = String(err.extensions?.code ?? "").toUpperCase();
      if (code.includes("CONFLICT")) {
        // A CONFLICT is also what a create still running under the same
        // requestId answers; only a name clash is the name's error (w21/437).
        if (/still in progress/i.test(err.message ?? "")) return "creating";
        const { reasonCode, field } = (err.extensions ?? {}) as {
          reasonCode?: string;
          field?: string;
        };
        if (reasonCode === "LEDGER_NAME_ALREADY_EXISTS" || field === "name") {
          return "conflict";
        }
        const kind = classifyCreateLedgerError(err.message ?? "");
        if (kind !== "other") return kind;
        continue;
      }
      if (code.includes("RESOURCE_LIMIT") || code.includes("LIMIT"))
        return "tier";
      const kind = classifyCreateLedgerError(err.message ?? "");
      if (kind !== "other") return kind;
    }
  }
  return "other";
}

/** The limit and plan a ledger-limit refusal names, when the server sent them. */
export function tierLimitDetail(
  err: unknown,
): { limit: number; tier: string } | null {
  for (const { code, limit, tier } of graphQLErrorExtensions(err)) {
    if (
      code === "RESOURCE_LIMIT_REACHED" &&
      typeof limit === "number" &&
      typeof tier === "string"
    ) {
      return { limit, tier };
    }
  }
  return null;
}
