import { BadUserInputError } from "@/shared/errors";

/**
 * Transport backstop on BQL query size, applied where REST, GraphQL and MCP
 * all converge (`LedgerShellService`) so no surface can be the soft one.
 *
 * This is NOT the protection against pathological queries — the ledger
 * service refuses those on their actual shape (operator chain length), because
 * size and danger are barely correlated: a few tens of kilobytes of one
 * repeated operator is far worse for the engine than a megabyte of ordinary
 * SELECT text. What this cap does is stop an absurd payload from being
 * authorized, forwarded over an internal hop and parsed before anything looks
 * at it.
 *
 * Hence the generosity. `BQL_SIZE_DESCRIPTION` advertises that long queries
 * have no URL-length ceiling, and 60 KB queries are proven to run identically
 * on all three surfaces, so the cap sits well clear of real use and only
 * catches payloads no legitimate caller sends.
 */
export const MAX_BQL_QUERY_BYTES = 256 * 1024;

/** Refuse a query whose UTF-8 size is past {@link MAX_BQL_QUERY_BYTES}. */
export function assertBqlQueryWithinSizeLimit(query: string): void {
  // Bytes, not characters: a query full of multibyte narration text costs more
  // on the wire than its length suggests.
  const bytes = Buffer.byteLength(query, "utf8");
  if (bytes > MAX_BQL_QUERY_BYTES) {
    throw new BadUserInputError(
      `BQL query is ${bytes} bytes, over the limit of ${MAX_BQL_QUERY_BYTES}.`,
      "query",
      "Split the query into smaller ones.",
    );
  }
}
