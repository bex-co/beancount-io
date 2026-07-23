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

/** Derive file extension from a MIME type, falling back to jpg. */
export const mimeToExt = (mimeType: string): string =>
  mimeType.split("/")[1] ?? "jpg";
