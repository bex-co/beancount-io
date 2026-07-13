import type { ReceiptPostingInput } from "@/generated-graphql/graphql";

/** Build the two balanced postings for a receipt transaction. */
export const buildReceiptPostings = (
  amount: number,
  targetAccount: string,
  sourceAccount: string,
  currency: string,
): ReceiptPostingInput[] => [
  {
    account: targetAccount,
    amountNumber: amount.toFixed(2),
    amountCurrency: currency,
  },
  {
    account: sourceAccount,
    amountNumber: (-amount).toFixed(2),
    amountCurrency: currency,
  },
];

/** Map an internal error code to a translation key. */
export const receiptErrorKey = (
  code: string,
):
  | "receiptQuotaExhausted"
  | "receiptParseFailed"
  | "receiptUploadFailed"
  | "receiptSaveFailed" => {
  if (code === "quota_exhausted") return "receiptQuotaExhausted";
  if (code === "parse_failed") return "receiptParseFailed";
  if (code === "save_failed") return "receiptSaveFailed";
  return "receiptUploadFailed";
};

/** Derive file extension from a MIME type, falling back to jpg. */
export const mimeToExt = (mimeType: string): string =>
  mimeType.split("/")[1] ?? "jpg";
