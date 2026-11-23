import { lexesAsAccount } from "./account-matcher";
import { BadUserInputError } from "@/shared/errors";

const POSTINGS_HINT =
  "Include at least one posting (typically balanced debit and credit postings).";
const DOCUMENT_ACCOUNT_HINT =
  'Pass a colon-separated Beancount account name such as "Expenses:Food:Dining" or "Assets:Bank:Checking".';

/**
 * Validate receipt-insert input shape before authorization, ledger reads,
 * S3 promotion, or Git commits (w31/053).
 */
export function assertValidReceiptInsertInput(input: {
  postings: readonly unknown[];
  documentAccount: string;
}): void {
  if (input.postings.length === 0) {
    throw new BadUserInputError(
      "postings must contain at least one posting",
      "postings",
      POSTINGS_HINT,
    );
  }
  if (!lexesAsAccount(input.documentAccount)) {
    throw new BadUserInputError(
      `documentAccount ${JSON.stringify(input.documentAccount)} is not a valid Beancount account name`,
      "documentAccount",
      DOCUMENT_ACCOUNT_HINT,
    );
  }
}
