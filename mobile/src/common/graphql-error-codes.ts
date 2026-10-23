/** The `extensions` of every GraphQL error an Apollo error carries. */
export function graphQLErrorExtensions(
  err: unknown,
): Record<string, unknown>[] {
  if (typeof err !== "object" || err === null) return [];
  const gqlErrors = (err as { graphQLErrors?: unknown }).graphQLErrors;
  if (!Array.isArray(gqlErrors)) return [];
  return gqlErrors.flatMap((e) => {
    const extensions = (e as { extensions?: unknown } | null)?.extensions;
    return typeof extensions === "object" && extensions !== null
      ? [extensions as Record<string, unknown>]
      : [];
  });
}

/** The `extensions.code` of every GraphQL error an Apollo error carries. */
export function graphQLErrorCodes(err: unknown): string[] {
  return graphQLErrorExtensions(err).flatMap(({ code }) =>
    typeof code === "string" ? [code] : [],
  );
}

/**
 * Whether a read of the selected ledger answered that it no longer exists —
 * deleted, renamed, or access withdrawn on the web. Every Home card used to
 * show its own "Failed to load · Try again", which could never succeed
 * (w21/054). A network failure is not "gone".
 */
export function isLedgerGone(err: unknown): boolean {
  const errors =
    typeof err === "object" && err !== null
      ? (err as { graphQLErrors?: unknown }).graphQLErrors
      : undefined;
  if (!Array.isArray(errors)) return false;
  return errors.some((error) => {
    const { message, extensions } = (error ?? {}) as {
      message?: unknown;
      extensions?: { code?: unknown };
    };
    // A ledger whose main.bean is missing answers NOT_FOUND too ("Ledger entry
    // point … not found"), but the repository is there and its Files are the
    // way to repair it: it is not gone (w21/859).
    return (
      extensions?.code === "NOT_FOUND" &&
      !(typeof message === "string" && /entry point/i.test(message))
    );
  });
}

/**
 * Whether a write was refused because this account may no longer write to the
 * ledger (a collaborator downgraded to read): retrying cannot succeed
 * (w21/474).
 */
export function isWriteForbidden(err: unknown): boolean {
  return graphQLErrorCodes(err).includes("FORBIDDEN");
}

/**
 * Whether the launch check of the persisted ledger selection should drop it:
 * only when the server says the ledger is gone or no longer yours. Any other
 * failure (SERVICE_UNAVAILABLE, RATE_LIMITED, INTERNAL_SERVER_ERROR, a
 * timeout) says nothing about the selection, and clearing it on one lost it
 * for good when the ledger service was briefly down (w21/182).
 */
export function shouldClearLedgerSelection(err: unknown): boolean {
  const codes = graphQLErrorCodes(err);
  return codes.includes("NOT_FOUND") || codes.includes("FORBIDDEN");
}
