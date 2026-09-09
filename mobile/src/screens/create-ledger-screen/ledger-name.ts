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

export type CreateLedgerErrorKind = "conflict" | "tier" | "other";

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
      if (code.includes("CONFLICT")) return "conflict";
      if (code.includes("RESOURCE_LIMIT") || code.includes("LIMIT"))
        return "tier";
      const kind = classifyCreateLedgerError(err.message ?? "");
      if (kind !== "other") return kind;
    }
  }
  return "other";
}
