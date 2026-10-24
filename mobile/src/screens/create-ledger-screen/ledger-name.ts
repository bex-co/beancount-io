import { isUnsupportedDocumentError } from "../../common/graphql-unsupported";

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
/**
 * The name as the setup's title: a tab or line break pasted from a spreadsheet
 * cell or a note becomes a space, and the ends are trimmed. The server refuses
 * a title with a control character, so Review showed its English text and
 * kept Create disabled (w21/950).
 */
export function setupTitle(name: string): string {
  return name
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

/**
 * A short fingerprint of the request a create sends, without its `requestId`.
 * The server judges a repeated `requestId` by the whole request, so the screen
 * keeps one id only while the request stays the same, and a draft can carry
 * this instead of the amount it must not hold (w21/434). Not a secret and not
 * a security hash: it only has to tell two requests apart.
 */
export function createRequestFingerprint(request: unknown): string {
  const text = JSON.stringify(request) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Whether a create is a different request from the last one sent, so it needs
 * an id of its own: the server refuses a reused id whose request changed, for
 * 24 hours, whatever the person edits next.
 */
export function isNewCreateRequest(
  lastSent: string | undefined,
  fingerprint: string,
): boolean {
  return lastSent !== undefined && lastSent !== fingerprint;
}

/** Whether the server refused because the `requestId` was used with another request. */
export function isRequestIdReuse(error: unknown): boolean {
  const messages = [
    error instanceof Error ? error.message : "",
    ...(
      (error as { graphQLErrors?: Array<{ message?: string }> } | null)
        ?.graphQLErrors ?? []
    ).map((entry) => entry.message ?? ""),
  ];
  return messages.some((message) =>
    message.toLowerCase().includes("requestid was already used"),
  );
}

/**
 * What a failed setup preview means for Review: `refused` when the server read
 * the setup and said what is wrong with it (its own words are the answer), else
 * `unreachable`, a transport or server failure whose raw text ("Network request
 * failed", "Received status code 502") is English and says nothing the person
 * can use (w21/478).
 */
export function previewFailureKind(
  error: unknown,
): "refused" | "unreachable" | "unsupported" {
  // A server older than guided setup rejects the document: there is nothing to
  // retry, and Starter and Sample still create (ADR021, w21/592).
  if (isUnsupportedDocumentError(error)) return "unsupported";
  const codes = (
    (
      error as {
        graphQLErrors?: Array<{ extensions?: { code?: unknown } }>;
      } | null
    )?.graphQLErrors ?? []
  ).map((entry) => String(entry.extensions?.code ?? ""));
  return codes.some(
    (code) => code === "BAD_USER_INPUT" || code === "VALIDATION_FAILED",
  )
    ? "refused"
    : "unreachable";
}
