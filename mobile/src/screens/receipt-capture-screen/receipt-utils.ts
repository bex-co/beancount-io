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

/** Derive file extension from a MIME type, falling back to jpg. */
export const mimeToExt = (mimeType: string): string =>
  mimeType.split("/")[1] ?? "jpg";
