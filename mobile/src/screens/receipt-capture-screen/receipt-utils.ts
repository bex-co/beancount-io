import { getFormatDate } from "../../common/format-util";

/**
 * Resolve the receipt's transaction date. The server may now return an
 * empty/absent date when it can't read one off the receipt — fall back to the
 * client's today so the form always opens with a usable date.
 */
export const receiptDate = (date: string | null | undefined): string =>
  date || getFormatDate(new Date());

/**
 * Map an internal error code to a translation key.
 *
 * Only covers the capture → upload → parse leg; saving happens later on the
 * transaction form, which reports its own errors.
 */
export const receiptErrorKey = (
  code: string,
): "receiptQuotaExhausted" | "receiptParseFailed" | "receiptUploadFailed" => {
  if (code === "quota_exhausted") return "receiptQuotaExhausted";
  if (code === "parse_failed") return "receiptParseFailed";
  return "receiptUploadFailed";
};

/**
 * Classify a failure thrown by the parse-leg mutation into an internal code.
 *
 * Under Apollo's default errorPolicy a GraphQL error rejects the promise
 * rather than populating `result.errors`, so the leg is classified here from
 * the thrown `ApolloError`'s `graphQLErrors[].extensions.code`. The backend
 * raises `RESOURCE_LIMIT_REACHED` when the AI quota is spent (ADR 0011);
 * everything else on this leg is a parse failure. A network error carries no
 * GraphQL codes and falls through to `parse_failed` — the upload already
 * succeeded, so it is not an upload failure.
 */
export const parseErrorCode = (
  err: unknown,
): "quota_exhausted" | "parse_failed" => {
  const codes = graphQLErrorCodes(err);
  if (codes.includes("RESOURCE_LIMIT_REACHED")) return "quota_exhausted";
  return "parse_failed";
};

function graphQLErrorCodes(err: unknown): string[] {
  if (typeof err !== "object" || err === null) return [];
  const gqlErrors = (err as { graphQLErrors?: unknown }).graphQLErrors;
  if (!Array.isArray(gqlErrors)) return [];
  return gqlErrors
    .map((e) => {
      const code = (e as { extensions?: { code?: unknown } })?.extensions?.code;
      return typeof code === "string" ? code : undefined;
    })
    .filter((c): c is string => c !== undefined);
}

/** Derive file extension from a MIME type, falling back to jpg. */
export const mimeToExt = (mimeType: string): string =>
  mimeType.split("/")[1] ?? "jpg";
